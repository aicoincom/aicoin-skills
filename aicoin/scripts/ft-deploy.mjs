#!/usr/bin/env node
// Freqtrade One-Click Deployment via pip + venv (no Docker)
// Auto-installs system dependencies (TA-Lib, HDF5) based on platform
// Reads exchange keys from .env, creates config, starts as background process
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Load .env
function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env'),
    resolve(process.env.HOME || '', '.openclaw', '.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      for (const line of readFileSync(file, 'utf-8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq < 1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {}
  }
}
loadEnv();

const FT_DIR = resolve(process.env.HOME || '', '.freqtrade');
const VENV_DIR = resolve(FT_DIR, 'venv');
const USER_DATA = resolve(FT_DIR, 'user_data');
const STRAT_DIR = resolve(USER_DATA, 'strategies');
const CONFIG_PATH = resolve(USER_DATA, 'config.json');
const PID_FILE = resolve(FT_DIR, 'freqtrade.pid');
const LOG_FILE = resolve(FT_DIR, 'freqtrade.log');
const API_PORT = process.env.FREQTRADE_PORT || '8080';
const ENV_FILE = resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env');

const FT_BIN = resolve(VENV_DIR, 'bin', 'freqtrade');

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 600000, ...opts }).trim();
}

function hasCommand(cmd) {
  try { run(`which ${cmd}`); return true; } catch { return false; }
}

// ─── System dependency management ───

function hasTALib() {
  try {
    if (process.platform === 'darwin') {
      run('brew list ta-lib 2>/dev/null');
      return true;
    } else {
      // Check for shared library on Linux
      run('test -f /usr/local/lib/libta_lib.so -o -f /usr/lib/libta_lib.so -o -f /usr/lib/x86_64-linux-gnu/libta_lib.so');
      return true;
    }
  } catch {
    // Also check ldconfig
    try { run('ldconfig -p 2>/dev/null | grep libta_lib'); return true; } catch {}
    return false;
  }
}

function installSystemDeps() {
  const platform = process.platform; // 'darwin' or 'linux'

  if (platform === 'darwin') {
    // macOS — use Homebrew
    if (!hasCommand('brew')) {
      throw new Error('Homebrew not found. Install: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    }
    // Skip brew auto-update — it can take minutes and cause timeouts
    const brewEnv = { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_CLEANUP: '1' };

    if (!hasTALib()) {
      console.error('Installing TA-Lib via Homebrew...');
      try {
        run('brew install ta-lib', { timeout: 300000, env: brewEnv });
      } catch (e) {
        throw new Error(`Failed to install TA-Lib: ${e.message}\nManual fix: HOMEBREW_NO_AUTO_UPDATE=1 brew install ta-lib`);
      }
    }

    // HDF5 — check separately
    let hasHDF5 = false;
    try { run('brew list hdf5 2>/dev/null'); hasHDF5 = true; } catch {}
    if (!hasHDF5) {
      console.error('Installing HDF5 via Homebrew...');
      try {
        run('brew install hdf5', { timeout: 300000, env: brewEnv });
      } catch (e) {
        throw new Error(`Failed to install HDF5: ${e.message}\nManual fix: HOMEBREW_NO_AUTO_UPDATE=1 brew install hdf5`);
      }
    }
  } else if (platform === 'linux') {
    // Linux — use apt + compile TA-Lib from source if needed
    const sudo = hasCommand('sudo') ? 'sudo ' : '';
    try {
      console.error('Installing build dependencies...');
      run(`${sudo}apt-get update -qq && ${sudo}apt-get install -y -qq build-essential python3-dev python3-venv python3-pip wget libhdf5-dev`, { timeout: 120000 });
    } catch {
      console.error('Warning: apt-get failed. Some build packages may be missing. Continuing...');
    }

    if (!hasTALib()) {
      // Try apt package first
      try {
        run(`${sudo}apt-get install -y -qq libta-lib-dev`, { timeout: 60000 });
      } catch {
        // Compile TA-Lib from source
        console.error('Compiling TA-Lib from source (this may take 1-2 minutes)...');
        try {
          run([
            'cd /tmp',
            'wget -q https://sourceforge.net/projects/ta-lib/files/ta-lib/0.4.0/ta-lib-0.4.0-src.tar.gz',
            'tar xzf ta-lib-0.4.0-src.tar.gz',
            'cd ta-lib',
            './configure --prefix=/usr/local',
            `make -j$(nproc 2>/dev/null || echo 2)`,
            `${sudo}make install`,
          ].join(' && '), { timeout: 600000 });
          try { run(`${sudo}ldconfig`); } catch {}
        } catch (e) {
          throw new Error(`Failed to install TA-Lib from source: ${e.message}\nManual install: https://github.com/TA-Lib/ta-lib-python#dependencies`);
        }
      }
    }
  }
}

function checkSystemDeps() {
  const deps = {};
  deps.ta_lib = hasTALib();
  if (process.platform === 'darwin') {
    try { run('brew list hdf5 2>/dev/null'); deps.hdf5 = true; } catch { deps.hdf5 = false; }
  } else {
    try { run('dpkg -l libhdf5-dev 2>/dev/null | grep -q "^ii"'); deps.hdf5 = true; } catch { deps.hdf5 = false; }
  }
  deps.all_ok = deps.ta_lib && deps.hdf5;
  return deps;
}

// ─── Exchange & config ───

function detectExchange() {
  const exchanges = ['BINANCE', 'OKX', 'BYBIT', 'BITGET', 'GATE', 'HTX', 'KUCOIN', 'MEXC'];
  for (const ex of exchanges) {
    if (process.env[`${ex}_API_KEY`] && process.env[`${ex}_API_SECRET`]) {
      return {
        name: ex.toLowerCase(),
        key: process.env[`${ex}_API_KEY`],
        secret: process.env[`${ex}_API_SECRET`],
        password: process.env[`${ex}_PASSWORD`] || '',
      };
    }
  }
  return null;
}

function generateConfig(exchangeInfo, apiPassword, params = {}) {
  const config = {
    trading_mode: params.trading_mode || 'futures',
    margin_mode: params.margin_mode || 'isolated',
    max_open_trades: params.max_open_trades || 3,
    stake_currency: 'USDT',
    stake_amount: params.stake_amount || 'unlimited',
    tradable_balance_ratio: params.tradable_balance_ratio || 0.5,
    dry_run: params.dry_run !== false,
    dry_run_wallet: 1000,
    cancel_open_orders_on_exit: false,
    exchange: {
      name: exchangeInfo.name,
      key: exchangeInfo.key,
      secret: exchangeInfo.secret,
      ...(exchangeInfo.password ? { password: exchangeInfo.password } : {}),
      ccxt_config: {},
      ccxt_async_config: {},
      pair_whitelist: params.pairs || ['BTC/USDT:USDT', 'ETH/USDT:USDT'],
      pair_blacklist: [],
    },
    pairlists: [{ method: 'StaticPairList' }],
    entry_pricing: { price_side: 'same', use_order_book: true, order_book_top: 1 },
    exit_pricing: { price_side: 'same', use_order_book: true, order_book_top: 1 },
    api_server: {
      enabled: true,
      listen_ip_address: '127.0.0.1',
      listen_port: Number(API_PORT),
      verbosity: 'error',
      enable_openapi: false,
      jwt_secret_key: randomBytes(16).toString('hex'),
      CORS_origins: [],
      username: 'freqtrader',
      password: apiPassword,
    },
    bot_name: 'aicoin-freqtrade',
    initial_state: 'running',
    force_entry_enable: true,
    internals: { process_throttle_secs: 5 },
  };
  const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    config.exchange.ccxt_config.proxies = { https: proxyUrl, http: proxyUrl };
  }
  return config;
}

function appendEnv(key, val) {
  if (!existsSync(ENV_FILE)) {
    writeFileSync(ENV_FILE, `${key}=${val}\n`);
    return;
  }
  const content = readFileSync(ENV_FILE, 'utf-8');
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.trim().startsWith(`${key}=`));
  if (idx >= 0) {
    lines[idx] = `${key}=${val}`;
    writeFileSync(ENV_FILE, lines.join('\n'));
  } else {
    writeFileSync(ENV_FILE, content.trimEnd() + `\n${key}=${val}\n`);
  }
}

function getPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  if (!pid) return null;
  try { process.kill(Number(pid), 0); return Number(pid); } catch { return null; }
}

// ─── Actions ───

const actions = {
  check: async () => {
    const checks = {};
    // Python
    try { checks.python = run('python3 --version'); } catch { checks.python = false; }
    // pip
    try { checks.pip = run('python3 -m pip --version').split(' ')[1]; } catch { checks.pip = false; }
    // System dependencies (TA-Lib, HDF5)
    checks.system_deps = checkSystemDeps();
    // Freqtrade installed
    checks.freqtrade_installed = existsSync(FT_BIN);
    // Exchange keys
    const ex = detectExchange();
    checks.exchange = ex ? { name: ex.name, configured: true } : { configured: false };
    // Running
    const pid = getPid();
    checks.running = !!pid;
    if (pid) checks.pid = pid;

    checks.ready = !!checks.python && checks.exchange?.configured;
    if (!checks.ready) {
      checks.missing = [];
      if (!checks.python) checks.missing.push('Python 3 not found. Install: apt install python3 python3-venv python3-pip');
      if (!checks.exchange?.configured) checks.missing.push('No exchange API keys in .env');
    }
    if (!checks.system_deps.all_ok) {
      checks.note = 'System dependencies (TA-Lib, HDF5) not found. They will be auto-installed during deploy.';
    }
    return checks;
  },

  deploy: async (params = {}) => {
    // 1. Check Python
    try { run('python3 --version'); } catch {
      throw new Error('Python 3 not found. Install: apt install python3 python3-venv python3-pip');
    }

    // 2. Detect exchange
    const exchangeInfo = detectExchange();
    if (!exchangeInfo) throw new Error('No exchange API keys found in .env');

    // 3. Create directories
    mkdirSync(STRAT_DIR, { recursive: true });

    // 4. Install system dependencies (TA-Lib, HDF5) if missing
    console.error('Checking system dependencies...');
    installSystemDeps();

    // 5. Create venv + install freqtrade (if not already installed)
    if (!existsSync(FT_BIN)) {
      console.error('Creating Python venv and installing Freqtrade (this may take a few minutes)...');
      run(`python3 -m venv ${VENV_DIR}`);
      run(`${resolve(VENV_DIR, 'bin', 'pip')} install --upgrade pip wheel`, { timeout: 120000 });
      run(`${resolve(VENV_DIR, 'bin', 'pip')} install freqtrade`, { timeout: 600000 });
    }

    // 6. Generate config
    const apiPassword = randomBytes(8).toString('hex');
    const config = generateConfig(exchangeInfo, apiPassword, params);
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // 7. Create sample strategy if none exists
    const samplePath = resolve(STRAT_DIR, 'SampleStrategy.py');
    if (!existsSync(samplePath)) {
      writeFileSync(samplePath, SAMPLE_STRATEGY);
    }

    // 8. Stop existing process
    const oldPid = getPid();
    if (oldPid) { try { process.kill(oldPid, 'SIGTERM'); } catch {} }

    // 9. Start freqtrade as background process
    const strategy = params.strategy || 'SampleStrategy';
    run(`nohup ${FT_BIN} trade --config ${CONFIG_PATH} --strategy ${strategy} --userdir ${USER_DATA} > ${LOG_FILE} 2>&1 & echo $! > ${PID_FILE}`);

    // 10. Wait for startup
    let ready = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pid = getPid();
      if (pid) {
        try {
          const res = await fetch(`http://127.0.0.1:${API_PORT}/api/v1/ping`, {
            headers: { Authorization: 'Basic ' + Buffer.from(`freqtrader:${apiPassword}`).toString('base64') },
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) { ready = true; break; }
        } catch {}
      }
    }

    // 11. Write env vars
    appendEnv('FREQTRADE_URL', `http://127.0.0.1:${API_PORT}`);
    appendEnv('FREQTRADE_USERNAME', 'freqtrader');
    appendEnv('FREQTRADE_PASSWORD', apiPassword);

    return {
      success: true,
      exchange: exchangeInfo.name,
      strategy,
      dry_run: config.dry_run,
      pairs: config.exchange.pair_whitelist,
      api_url: `http://127.0.0.1:${API_PORT}`,
      api_password: apiPassword,
      pid: getPid(),
      ready,
      log_file: LOG_FILE,
      config_path: CONFIG_PATH,
      strategies_dir: STRAT_DIR,
      note: config.dry_run
        ? 'Running in DRY-RUN mode (no real money). Use deploy with {"dry_run":false} for live trading.'
        : 'WARNING: Running in LIVE mode with real money!',
    };
  },

  status: async () => {
    const pid = getPid();
    if (!pid) return { running: false };
    let lastLogs = '';
    try { lastLogs = run(`tail -5 ${LOG_FILE} 2>/dev/null`); } catch {}
    return { running: true, pid, log_file: LOG_FILE, last_logs: lastLogs };
  },

  stop: async () => {
    const pid = getPid();
    if (!pid) return { stopped: false, reason: 'Not running' };
    try { process.kill(pid, 'SIGTERM'); } catch {}
    try { writeFileSync(PID_FILE, ''); } catch {}
    return { stopped: true, pid };
  },

  start: async (params = {}) => {
    if (getPid()) return { started: false, reason: 'Already running' };
    if (!existsSync(CONFIG_PATH)) throw new Error('No config found. Run deploy first.');
    const strategy = params.strategy || 'SampleStrategy';
    run(`nohup ${FT_BIN} trade --config ${CONFIG_PATH} --strategy ${strategy} --userdir ${USER_DATA} > ${LOG_FILE} 2>&1 & echo $! > ${PID_FILE}`);
    await new Promise(r => setTimeout(r, 3000));
    return { started: true, pid: getPid() };
  },

  logs: async ({ lines = 50 } = {}) => {
    try { return { logs: run(`tail -${lines} ${LOG_FILE} 2>/dev/null`) }; } catch { return { logs: 'No log file found' }; }
  },

  remove: async () => {
    const pid = getPid();
    if (pid) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    try { writeFileSync(PID_FILE, ''); } catch {}
    return { removed: true, note: `Process stopped. Config preserved at ${FT_DIR}. To fully remove: rm -rf ${FT_DIR}` };
  },
};

// ─── Sample strategy (pure pandas, no TA-Lib dependency) ───

const SAMPLE_STRATEGY = `# Sample RSI + EMA strategy for Freqtrade
# Uses pure pandas — no TA-Lib C library required
from freqtrade.strategy import IStrategy
from pandas import DataFrame


class SampleStrategy(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = '5m'
    can_short = True

    minimal_roi = {"0": 0.05, "30": 0.03, "60": 0.02, "120": 0.01}

    stoploss = -0.03
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # RSI (pure pandas, no talib)
        delta = dataframe['close'].diff()
        gain = delta.clip(lower=0).rolling(window=14).mean()
        loss = (-delta.clip(upper=0)).rolling(window=14).mean()
        rs = gain / loss
        dataframe['rsi'] = 100 - (100 / (1 + rs))

        # EMA (pure pandas)
        dataframe['ema_fast'] = dataframe['close'].ewm(span=8, adjust=False).mean()
        dataframe['ema_slow'] = dataframe['close'].ewm(span=21, adjust=False).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe['rsi'] < 35) &
            (dataframe['ema_fast'] > dataframe['ema_slow']) &
            (dataframe['volume'] > 0),
            'enter_long'] = 1
        dataframe.loc[
            (dataframe['rsi'] > 65) &
            (dataframe['ema_fast'] < dataframe['ema_slow']) &
            (dataframe['volume'] > 0),
            'enter_short'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe['rsi'] > 70),
            'exit_long'] = 1
        dataframe.loc[
            (dataframe['rsi'] < 30),
            'exit_short'] = 1
        return dataframe
`;

// ─── CLI ───

const [action, ...rest] = process.argv.slice(2);
if (!action || !actions[action]) {
  console.log(`Usage: node ft-deploy.mjs <action> [json-params]\nActions: ${Object.keys(actions).join(', ')}`);
  process.exit(1);
}
const params = rest.length ? JSON.parse(rest.join(' ')) : {};
actions[action](params).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => {
  console.error(e.message); process.exit(1);
});
