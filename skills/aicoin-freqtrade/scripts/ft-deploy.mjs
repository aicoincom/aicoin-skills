#!/usr/bin/env node
// Freqtrade One-Click Deployment via git clone + setup.sh (official method)
// Reads exchange keys from .env, creates config, starts as background process
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

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
const SRC_DIR = resolve(FT_DIR, 'source');
const VENV_DIR = resolve(SRC_DIR, '.venv');
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

// Find the best Python >= 3.11 (Freqtrade requirement)
function findPython() {
  for (const bin of ['python3.13', 'python3.12', 'python3.11', 'python3']) {
    try {
      const version = run(`${bin} --version`);
      const match = version.match(/(\d+)\.(\d+)/);
      if (match) {
        const major = Number(match[1]), minor = Number(match[2]);
        if (major === 3 && minor >= 11) return { bin, major, minor, version };
      }
    } catch {}
  }
  return null;
}

// Ensure Python 3.11+ is available (Freqtrade requirement)
function ensureModernPython() {
  let py = findPython();
  if (py) return py;

  // No Python 3.11+ found — try to install
  if (process.platform === 'darwin') {
    if (!hasCommand('brew')) {
      throw new Error('Homebrew not found. Install: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    }
    console.error('Python 3.11+ not found. Installing Python 3.12 via Homebrew...');
    const brewEnv = { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_CLEANUP: '1' };
    run('brew install python@3.12', { timeout: 300000, env: brewEnv });
    py = findPython();
    if (py) return py;
  }

  throw new Error('Python 3.11+ required. Install: brew install python@3.12 (macOS) or apt install python3.12 python3.12-venv (Linux)');
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
    config.exchange.ccxt_async_config.aiohttp_proxy = proxyUrl;
    // HTTP proxies don't support WebSocket — disable WS to force REST polling
    config.exchange.enable_ws = false;
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
    // Python — needs 3.11+
    const py = findPython();
    checks.python = py ? `${py.version} (${py.bin})` : false;
    if (!py) {
      // Check if any python3 exists but too old
      try {
        const v = run('python3 --version');
        checks.python_warning = `${v} found but Freqtrade requires 3.11+. Deploy will auto-install 3.12.`;
      } catch {}
    }
    // git
    checks.git = hasCommand('git');
    // Freqtrade source
    checks.source_cloned = existsSync(resolve(SRC_DIR, 'setup.sh'));
    // Freqtrade installed
    checks.freqtrade_installed = existsSync(FT_BIN);
    if (checks.freqtrade_installed) {
      try { checks.freqtrade_version = run(`${FT_BIN} --version`); } catch {}
    }
    // Exchange keys
    const ex = detectExchange();
    checks.exchange = ex ? { name: ex.name, configured: true } : { configured: false };
    // Running
    const pid = getPid();
    checks.running = !!pid;
    if (pid) checks.pid = pid;

    checks.ready = (!!py || process.platform === 'darwin') && checks.git && checks.exchange?.configured;
    if (!checks.ready) {
      checks.missing = [];
      if (!py && process.platform !== 'darwin') checks.missing.push('Python 3.11+ not found');
      if (!checks.git) checks.missing.push('git not found');
      if (!checks.exchange?.configured) checks.missing.push('No exchange API keys in .env');
    }
    return checks;
  },

  deploy: async (params = {}) => {
    // 1. Ensure Python 3.11+ (auto-installs on macOS if needed)
    const py = ensureModernPython();
    console.error(`Using ${py.version} (${py.bin})`);

    // 2. Ensure git
    if (!hasCommand('git')) throw new Error('git not found. Install: apt install git (Linux) or xcode-select --install (macOS)');

    // 3. Detect exchange
    const exchangeInfo = detectExchange();
    if (!exchangeInfo) throw new Error('No exchange API keys found in .env');

    // 4. Create directories
    mkdirSync(STRAT_DIR, { recursive: true });

    // 4b. Copy AiCoin Python SDK + strategy templates
    const skillDir = resolve(__dir, '..');
    const sdkSrc = resolve(skillDir, 'lib', 'aicoin_data.py');
    const defaultsSrc = resolve(skillDir, 'lib', 'defaults.json');
    const strategiesSrc = resolve(skillDir, 'strategies');

    if (existsSync(sdkSrc)) {
      copyFileSync(sdkSrc, resolve(STRAT_DIR, 'aicoin_data.py'));
      console.error('Copied AiCoin Python SDK to strategies/');
    }
    if (existsSync(defaultsSrc)) {
      copyFileSync(defaultsSrc, resolve(STRAT_DIR, 'defaults.json'));
    }
    if (existsSync(strategiesSrc)) {
      for (const f of readdirSync(strategiesSrc)) {
        if (f.endsWith('.py')) {
          const dest = resolve(STRAT_DIR, f);
          if (!existsSync(dest)) {
            copyFileSync(resolve(strategiesSrc, f), dest);
            console.error(`Copied strategy template: ${f}`);
          }
        }
      }
    }

    // 5. Clone + install Freqtrade via official setup.sh
    if (!existsSync(FT_BIN)) {
      // Clone repo if not present
      if (!existsSync(resolve(SRC_DIR, 'setup.sh'))) {
        console.error('Cloning Freqtrade repository...');
        run(`git clone https://github.com/freqtrade/freqtrade.git ${SRC_DIR}`, { timeout: 120000 });
        run(`cd ${SRC_DIR} && git checkout stable`, { timeout: 30000 });
      }

      // Run official setup.sh (handles TA-Lib, venv, all dependencies)
      console.error('Running Freqtrade setup.sh (this may take a few minutes)...');
      run(`cd ${SRC_DIR} && ./setup.sh -i`, { timeout: 600000 });

      if (!existsSync(FT_BIN)) {
        throw new Error('Freqtrade installation failed. Check output above for errors.');
      }
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

    // 9. Start freqtrade as background process (with proxy env vars)
    const strategy = params.strategy || 'SampleStrategy';
    const proxyEnv = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyPrefix = proxyEnv ? `env HTTPS_PROXY=${proxyEnv} HTTP_PROXY=${proxyEnv} ` : '';
    run(`nohup ${proxyPrefix}${FT_BIN} trade --config ${CONFIG_PATH} --strategy ${strategy} --userdir ${USER_DATA} > ${LOG_FILE} 2>&1 & echo $! > ${PID_FILE}`);

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
      aicoin_strategies: existsSync(resolve(STRAT_DIR, 'aicoin_data.py'))
        ? ['FundingRateStrategy', 'WhaleFollowStrategy', 'LiquidationHunterStrategy']
        : [],
    };
  },

  update: async () => {
    if (!existsSync(resolve(SRC_DIR, 'setup.sh'))) {
      return { error: 'Freqtrade not installed. Run deploy first.' };
    }
    // Stop if running
    const pid = getPid();
    if (pid) { try { process.kill(pid, 'SIGTERM'); } catch {} }

    console.error('Updating Freqtrade...');
    run(`cd ${SRC_DIR} && ./setup.sh -u`, { timeout: 600000 });
    return { updated: true, note: 'Run start to restart Freqtrade.' };
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
    if (!existsSync(FT_BIN)) throw new Error('Freqtrade not installed. Run deploy first.');
    if (!existsSync(CONFIG_PATH)) throw new Error('No config found. Run deploy first.');
    const strategy = params.strategy || 'SampleStrategy';
    const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyPrefix = proxyUrl ? `env HTTPS_PROXY=${proxyUrl} HTTP_PROXY=${proxyUrl} ` : '';
    run(`nohup ${proxyPrefix}${FT_BIN} trade --config ${CONFIG_PATH} --strategy ${strategy} --userdir ${USER_DATA} > ${LOG_FILE} 2>&1 & echo $! > ${PID_FILE}`);
    await new Promise(r => setTimeout(r, 3000));
    return { started: true, pid: getPid() };
  },

  logs: async ({ lines = 50 } = {}) => {
    try { return { logs: run(`tail -${lines} ${LOG_FILE} 2>/dev/null`) }; } catch { return { logs: 'No log file found' }; }
  },

  backtest: async (params = {}) => {
    if (!existsSync(FT_BIN)) throw new Error('Freqtrade not installed. Run deploy first.');
    if (!existsSync(CONFIG_PATH)) throw new Error('No config found. Run deploy first.');
    const strategy = params.strategy || 'SampleStrategy';
    const timeframe = params.timeframe || '1h';
    const timerange = params.timerange || '';
    const timerangeArg = timerange ? ` --timerange ${timerange}` : '';

    const proxyEnv = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyPrefix = proxyEnv ? `env HTTPS_PROXY=${proxyEnv} HTTP_PROXY=${proxyEnv} ` : '';

    // Auto-download historical data first
    console.error('Downloading historical data...');
    try {
      run(
        `${proxyPrefix}${FT_BIN} download-data --config ${CONFIG_PATH} --timeframe ${timeframe}${timerangeArg} --userdir ${USER_DATA}`,
        { timeout: 300000 }
      );
    } catch (e) {
      console.error(`Data download warning: ${e.message}`);
    }

    // Run backtest
    console.error(`Running backtest: strategy=${strategy}, timeframe=${timeframe}${timerange ? `, timerange=${timerange}` : ''}...`);
    const output = run(
      `${proxyPrefix}${FT_BIN} backtesting --config ${CONFIG_PATH} --strategy ${strategy} --timeframe ${timeframe}${timerangeArg} --userdir ${USER_DATA}`,
      { timeout: 600000 }
    );
    return { strategy, timeframe, timerange: timerange || 'all available', output };
  },

  download_data: async (params = {}) => {
    if (!existsSync(FT_BIN)) throw new Error('Freqtrade not installed. Run deploy first.');
    if (!existsSync(CONFIG_PATH)) throw new Error('No config found. Run deploy first.');
    const timeframe = params.timeframe || '1h';
    const timerange = params.timerange || '';
    const timerangeArg = timerange ? ` --timerange ${timerange}` : '';

    const proxyEnv = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyPrefix = proxyEnv ? `env HTTPS_PROXY=${proxyEnv} HTTP_PROXY=${proxyEnv} ` : '';

    console.error(`Downloading data: timeframe=${timeframe}${timerange ? `, timerange=${timerange}` : ''}...`);
    const output = run(
      `${proxyPrefix}${FT_BIN} download-data --config ${CONFIG_PATH} --timeframe ${timeframe}${timerangeArg} --userdir ${USER_DATA}`,
      { timeout: 300000 }
    );
    return { timeframe, timerange: timerange || 'all available', output };
  },

  hyperopt: async (params = {}) => {
    if (!existsSync(FT_BIN)) throw new Error('Freqtrade not installed. Run deploy first.');
    if (!existsSync(CONFIG_PATH)) throw new Error('No config found. Run deploy first.');

    const strategy = params.strategy || 'SampleStrategy';
    const timeframe = params.timeframe || '1h';
    const timerange = params.timerange || '';
    const epochs = Math.min(Number(params.epochs) || 100, 500);
    const spaces = params.spaces || 'roi stoploss trailing buy sell';
    const jobs = Math.min(Number(params.jobs) || 1, 4);
    const lossFunc = params.loss || 'SharpeHyperOptLoss';
    const minTrades = params.min_trades || 20;
    const timerangeArg = timerange ? ` --timerange ${timerange}` : '';

    const proxyEnv = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyPrefix = proxyEnv ? `env HTTPS_PROXY=${proxyEnv} HTTP_PROXY=${proxyEnv} ` : '';

    console.error('Downloading historical data for hyperopt...');
    try {
      run(
        `${proxyPrefix}${FT_BIN} download-data --config ${CONFIG_PATH} --timeframe ${timeframe}${timerangeArg} --userdir ${USER_DATA}`,
        { timeout: 300000 }
      );
    } catch (e) {
      console.error(`Data download warning: ${e.message}`);
    }

    console.error(`Running hyperopt: strategy=${strategy}, epochs=${epochs}, jobs=${jobs}, spaces=${spaces}`);
    const output = run(
      `${proxyPrefix}${FT_BIN} hyperopt --config ${CONFIG_PATH} --strategy ${strategy} --timeframe ${timeframe}${timerangeArg} --userdir ${USER_DATA} --hyperopt-loss ${lossFunc} --spaces ${spaces} --epochs ${epochs} -j ${jobs} --min-trades ${minTrades}`,
      { timeout: 1800000 }
    );

    return { strategy, timeframe, epochs, spaces, jobs, loss_function: lossFunc, output };
  },

  create_strategy: async (params = {}) => {
    const name = params.name;
    if (!name) throw new Error('name is required. Example: {"name":"MyStrategy","timeframe":"15m","aicoin_data":["funding_rate","ls_ratio"]}');
    if (!/^[A-Z][A-Za-z0-9_]+$/.test(name)) throw new Error('name must be a valid Python class name starting with uppercase (e.g. MyStrategy)');

    mkdirSync(STRAT_DIR, { recursive: true });
    const dest = resolve(STRAT_DIR, `${name}.py`);
    const tf = params.timeframe || '15m';
    const desc = params.description || 'Custom strategy';
    const PAID_DATA = { big_orders: 'Standard ($79/mo)', open_interest: 'Professional ($699/mo)', liquidation_map: 'Advanced ($299/mo)' };
    const ds = new Set(params.aicoin_data || []);

    // Detect if using built-in free key (no custom key configured)
    const KEY = process.env.AICOIN_ACCESS_KEY_ID || '';
    const defaultKey = JSON.parse(readFileSync(resolve(__dir, '..', 'lib', 'defaults.json'), 'utf8')).accessKeyId || '';
    const usingFreeKey = !KEY || KEY === defaultKey;
    const paidUsed = [...ds].filter(d => d in PAID_DATA);

    const code = buildStrategyCode(name, tf, desc, ds);
    writeFileSync(dest, code);

    const result = {
      success: true,
      strategy: name,
      file: dest,
      timeframe: tf,
      aicoin_data: [...ds],
      note: ds.size
        ? `Strategy uses AiCoin data (${[...ds].join(', ')}) in live/dry_run. Falls back to pure technical indicators in backtest.`
        : 'Pure technical indicator strategy. To add AiCoin data, pass aicoin_data array.',
      available_aicoin_data: ['funding_rate (Free)', 'ls_ratio (Free)', 'big_orders (Standard)', 'open_interest (Professional)', 'liquidation_map (Advanced)'],
    };

    if (usingFreeKey && paidUsed.length > 0) {
      result.warning = `PAID KEY REQUIRED — Strategy uses ${paidUsed.map(d => `${d} (${PAID_DATA[d]})`).join(', ')} but no paid API key is configured. These data sources will silently fall back to defaults in live mode. Guide user: get API key at https://www.aicoin.com/opendata → add AICOIN_ACCESS_KEY_ID & AICOIN_ACCESS_SECRET to .env.`;
    }

    return result;
  },

  strategy_list: async () => {
    const files = [];
    if (existsSync(STRAT_DIR)) {
      for (const f of readdirSync(STRAT_DIR)) {
        if (f.endsWith('.py') && f !== '__init__.py' && f !== 'aicoin_data.py') {
          files.push(f.replace('.py', ''));
        }
      }
    }
    return { strategies: files, path: STRAT_DIR };
  },

  remove: async () => {
    const pid = getPid();
    if (pid) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    try { writeFileSync(PID_FILE, ''); } catch {}
    return { removed: true, note: `Process stopped. Config preserved at ${FT_DIR}. To fully remove: rm -rf ${FT_DIR}` };
  },
};

// ─── Strategy code generator ───

function buildStrategyCode(name, tf, desc, ds) {
  const L = [];  // lines
  const has = k => ds.has(k);
  const any = ds.size > 0;

  // Header
  L.push(`# ${name} - ${desc}`);
  if (any) L.push(`# AiCoin data: ${[...ds].join(', ')} (live/dry_run only)`);
  L.push(`# Backtest: uses technical indicators only`);
  L.push(`#`);
  L.push(`from freqtrade.strategy import IStrategy, IntParameter, DecimalParameter`);
  L.push(`from pandas import DataFrame`);
  L.push(`import logging`);
  L.push(``);
  L.push(`logger = logging.getLogger(__name__)`);
  L.push(``);
  L.push(``);
  L.push(`class ${name}(IStrategy):`);
  L.push(`    INTERFACE_VERSION = 3`);
  L.push(`    timeframe = '${tf}'`);
  L.push(`    can_short = True`);
  L.push(``);
  L.push(`    minimal_roi = {"0": 0.05, "60": 0.03, "120": 0.01}`);
  L.push(`    stoploss = -0.05`);
  L.push(`    trailing_stop = True`);
  L.push(`    trailing_stop_positive = 0.02`);
  L.push(`    trailing_stop_positive_offset = 0.03`);
  L.push(``);
  L.push(`    # Hyperopt parameters`);
  L.push(`    rsi_buy = IntParameter(20, 40, default=30, space='buy')`);
  L.push(`    rsi_sell = IntParameter(60, 80, default=70, space='sell')`);
  if (has('funding_rate'))
    L.push(`    funding_threshold = DecimalParameter(0.005, 0.1, default=0.01, space='buy')`);
  L.push(``);

  // AiCoin instance vars
  if (any) {
    L.push(`    # AiCoin cached data (updated every 5 min in live mode)`);
    if (has('funding_rate'))     L.push(`    _ac_funding_rate = 0.0`);
    if (has('ls_ratio'))         L.push(`    _ac_ls_ratio = 0.5`);
    if (has('big_orders'))       L.push(`    _ac_whale_signal = 0.0`);
    if (has('open_interest'))    L.push(`    _ac_oi_rising = False`);
    if (has('liquidation_map'))  L.push(`    _ac_liq_bias = 0.0`);
    L.push(`    _ac_last_update = 0.0`);
    L.push(``);
  }

  // populate_indicators
  L.push(`    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:`);
  L.push(`        # RSI`);
  L.push(`        delta = dataframe['close'].diff()`);
  L.push(`        gain = delta.clip(lower=0).rolling(window=14).mean()`);
  L.push(`        loss = (-delta.clip(upper=0)).rolling(window=14).mean()`);
  L.push(`        rs = gain / loss`);
  L.push(`        dataframe['rsi'] = 100 - (100 / (1 + rs))`);
  L.push(``);
  L.push(`        # Bollinger Bands`);
  L.push(`        dataframe['bb_mid'] = dataframe['close'].rolling(window=20).mean()`);
  L.push(`        bb_std = dataframe['close'].rolling(window=20).std()`);
  L.push(`        dataframe['bb_upper'] = dataframe['bb_mid'] + 2 * bb_std`);
  L.push(`        dataframe['bb_lower'] = dataframe['bb_mid'] - 2 * bb_std`);
  L.push(``);
  L.push(`        # EMA`);
  L.push(`        dataframe['ema_fast'] = dataframe['close'].ewm(span=8, adjust=False).mean()`);
  L.push(`        dataframe['ema_slow'] = dataframe['close'].ewm(span=21, adjust=False).mean()`);
  L.push(``);
  L.push(`        # Volume SMA`);
  L.push(`        dataframe['vol_sma'] = dataframe['volume'].rolling(window=20).mean()`);

  if (any) {
    L.push(``);
    L.push(`        # AiCoin data columns (default values for backtest)`);
    if (has('funding_rate')) {
      L.push(`        dataframe['funding_rate'] = 0.0`);
      L.push(`        dataframe['funding_extreme'] = 0`);
    }
    if (has('ls_ratio'))         L.push(`        dataframe['ls_ratio'] = 0.5`);
    if (has('big_orders'))       L.push(`        dataframe['whale_signal'] = 0.0`);
    if (has('open_interest'))    L.push(`        dataframe['oi_rising'] = 0`);
    if (has('liquidation_map'))  L.push(`        dataframe['liq_bias'] = 0.0`);
    L.push(``);
    L.push(`        if self.dp and self.dp.runmode.value in ('live', 'dry_run'):`);
    L.push(`            import time`);
    L.push(`            now = time.time()`);
    L.push(`            if now - self._ac_last_update > 300:`);
    L.push(`                self._update_aicoin_data(metadata)`);
    L.push(`                self._ac_last_update = now`);
    L.push(``);
    if (has('funding_rate')) {
      L.push(`            dataframe.iloc[-1, dataframe.columns.get_loc('funding_rate')] = self._ac_funding_rate`);
      L.push(`            t = self.funding_threshold.value`);
      L.push(`            if self._ac_funding_rate > t:`);
      L.push(`                dataframe.iloc[-1, dataframe.columns.get_loc('funding_extreme')] = 1`);
      L.push(`            elif self._ac_funding_rate < -t:`);
      L.push(`                dataframe.iloc[-1, dataframe.columns.get_loc('funding_extreme')] = -1`);
    }
    if (has('ls_ratio'))
      L.push(`            dataframe.iloc[-1, dataframe.columns.get_loc('ls_ratio')] = self._ac_ls_ratio`);
    if (has('big_orders'))
      L.push(`            dataframe.iloc[-1, dataframe.columns.get_loc('whale_signal')] = self._ac_whale_signal`);
    if (has('open_interest'))
      L.push(`            dataframe.iloc[-1, dataframe.columns.get_loc('oi_rising')] = 1 if self._ac_oi_rising else 0`);
    if (has('liquidation_map'))
      L.push(`            dataframe.iloc[-1, dataframe.columns.get_loc('liq_bias')] = self._ac_liq_bias`);
  }

  L.push(``);
  L.push(`        return dataframe`);
  L.push(``);

  // _update_aicoin_data
  if (any) {
    L.push(`    def _update_aicoin_data(self, metadata: dict):`);
    L.push(`        try:`);
    L.push(`            import sys, os`);
    L.push(`            _sd = os.path.dirname(os.path.abspath(__file__))`);
    L.push(`            if _sd not in sys.path:`);
    L.push(`                sys.path.insert(0, _sd)`);
    L.push(`            from aicoin_data import AiCoinData, ccxt_to_aicoin`);
    L.push(`            ac = AiCoinData(cache_ttl=300)`);
    L.push(`            pair = metadata.get('pair', 'BTC/USDT:USDT')`);
    L.push(`            exchange = self.config.get('exchange', {}).get('name', 'binance')`);
    L.push(`            symbol = ccxt_to_aicoin(pair, exchange)`);
    if (has('open_interest'))
      L.push(`            base = pair.split('/')[0]`);
    L.push(``);

    if (has('funding_rate')) {
      L.push(`            try:`);
      L.push(`                data = ac.funding_rate(symbol, weighted=True, limit='5')`);
      L.push(`                items = data.get('data', [])`);
      L.push(`                if isinstance(items, list) and items:`);
      L.push(`                    latest = items[0]`);
      L.push(`                    if isinstance(latest, dict) and 'close' in latest:`);
      L.push(`                        self._ac_funding_rate = float(latest['close']) * 100`);
      L.push(`                        logger.info(f"AiCoin funding rate for {pair}: {self._ac_funding_rate:.4f}%")`);
      L.push(`            except Exception as e:`);
      L.push(`                logger.debug(f"AiCoin funding_rate unavailable: {e}")`);
      L.push(``);
    }
    if (has('ls_ratio')) {
      L.push(`            try:`);
      L.push(`                ls = ac.ls_ratio()`);
      L.push(`                detail = ls.get('data', {}).get('detail', {})`);
      L.push(`                if detail:`);
      L.push(`                    ratio = float(detail.get('last', 1.0))`);
      L.push(`                    self._ac_ls_ratio = max(0.0, min(1.0, ratio / (1.0 + ratio)))`);
      L.push(`                    logger.info(f"AiCoin L/S ratio: {self._ac_ls_ratio:.2f}")`);
      L.push(`            except Exception as e:`);
      L.push(`                logger.debug(f"AiCoin ls_ratio unavailable: {e}")`);
      L.push(``);
    }
    if (has('big_orders')) {
      L.push(`            try:`);
      L.push(`                orders = ac.big_orders(symbol)`);
      L.push(`                if 'data' in orders and isinstance(orders['data'], list):`);
      L.push(`                    buy_vol = sum(float(o.get('amount', 0)) for o in orders['data'] if o.get('side', '').lower() in ('buy', 'bid', 'long'))`);
      L.push(`                    sell_vol = sum(float(o.get('amount', 0)) for o in orders['data'] if o.get('side', '').lower() in ('sell', 'ask', 'short'))`);
      L.push(`                    total = buy_vol + sell_vol`);
      L.push(`                    if total > 0:`);
      L.push(`                        self._ac_whale_signal = (buy_vol - sell_vol) / total`);
      L.push(`                        logger.info(f"AiCoin whale signal for {pair}: {self._ac_whale_signal:.2f}")`);
      L.push(`            except Exception as e:`);
      L.push(`                logger.debug(f"AiCoin big_orders unavailable: {e}")`);
      L.push(``);
    }
    if (has('open_interest')) {
      L.push(`            try:`);
      L.push(`                oi_data = ac.open_interest(base, interval='${tf}', limit='10')`);
      L.push(`                if 'data' in oi_data and isinstance(oi_data['data'], list) and len(oi_data['data']) >= 2:`);
      L.push(`                    def get_oi(item):`);
      L.push(`                        for k in ('openInterest', 'open_interest', 'oi', 'value'):`);
      L.push(`                            if k in item: return float(item[k])`);
      L.push(`                        return 0`);
      L.push(`                    first_oi, last_oi = get_oi(oi_data['data'][0]), get_oi(oi_data['data'][-1])`);
      L.push(`                    if first_oi > 0:`);
      L.push(`                        change = (last_oi - first_oi) / first_oi * 100`);
      L.push(`                        self._ac_oi_rising = change > 3.0`);
      L.push(`                        logger.info(f"AiCoin OI: rising={self._ac_oi_rising}, change={change:.2f}%")`);
      L.push(`            except Exception as e:`);
      L.push(`                logger.debug(f"AiCoin OI unavailable: {e}")`);
      L.push(``);
    }
    if (has('liquidation_map')) {
      L.push(`            try:`);
      L.push(`                liq = ac.liquidation_map(symbol, cycle='24h')`);
      L.push(`                if 'data' in liq and isinstance(liq['data'], dict):`);
      L.push(`                    d = liq['data']`);
      L.push(`                    long_liq = float(d.get('longLiquidation', d.get('long_vol', 0)))`);
      L.push(`                    short_liq = float(d.get('shortLiquidation', d.get('short_vol', 0)))`);
      L.push(`                    total = long_liq + short_liq`);
      L.push(`                    if total > 0:`);
      L.push(`                        self._ac_liq_bias = (short_liq - long_liq) / total`);
      L.push(`                        logger.info(f"AiCoin liq bias for {pair}: {self._ac_liq_bias:.2f}")`);
      L.push(`            except Exception as e:`);
      L.push(`                logger.debug(f"AiCoin liquidation_map unavailable: {e}")`);
      L.push(``);
    }

    L.push(`        except ImportError:`);
    L.push(`            logger.warning("aicoin_data module not found. Run ft-deploy.mjs to install.")`);
    L.push(`        except Exception as e:`);
    L.push(`            logger.warning(f"AiCoin data error: {e}")`);
    L.push(``);
  }

  // populate_entry_trend
  const longC = [
    "(dataframe['rsi'] < self.rsi_buy.value)",
    "(dataframe['ema_fast'] > dataframe['ema_slow'])",
    "(dataframe['volume'] > dataframe['vol_sma'] * 0.5)",
  ];
  const shortC = [
    "(dataframe['rsi'] > self.rsi_sell.value)",
    "(dataframe['ema_fast'] < dataframe['ema_slow'])",
    "(dataframe['volume'] > dataframe['vol_sma'] * 0.5)",
  ];
  if (has('funding_rate'))     { longC.push("(dataframe['funding_extreme'] <= 0)");  shortC.push("(dataframe['funding_extreme'] >= 0)"); }
  if (has('ls_ratio'))         { longC.push("(dataframe['ls_ratio'] <= 0.55)");      shortC.push("(dataframe['ls_ratio'] >= 0.45)"); }
  if (has('big_orders'))       { longC.push("(dataframe['whale_signal'] >= -0.3)");  shortC.push("(dataframe['whale_signal'] <= 0.3)"); }
  if (has('liquidation_map'))  { longC.push("(dataframe['liq_bias'] >= -0.3)");      shortC.push("(dataframe['liq_bias'] <= 0.3)"); }

  L.push(`    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:`);
  L.push(`        dataframe.loc[`);
  longC.forEach((c, i) => L.push(`            ${c}${i < longC.length - 1 ? ' &' : ','}`));
  L.push(`            'enter_long'] = 1`);
  L.push(``);
  L.push(`        dataframe.loc[`);
  shortC.forEach((c, i) => L.push(`            ${c}${i < shortC.length - 1 ? ' &' : ','}`));
  L.push(`            'enter_short'] = 1`);
  L.push(``);
  L.push(`        return dataframe`);
  L.push(``);

  // populate_exit_trend
  L.push(`    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:`);
  L.push(`        dataframe.loc[`);
  L.push(`            (dataframe['rsi'] > 70),`);
  L.push(`            'exit_long'] = 1`);
  L.push(`        dataframe.loc[`);
  L.push(`            (dataframe['rsi'] < 30),`);
  L.push(`            'exit_short'] = 1`);
  L.push(`        return dataframe`);
  L.push(``);

  return L.join('\n');
}

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
actions[action](params).then(r => {
  r._reminder = 'IMPORTANT: Always use ft-deploy.mjs for ALL Freqtrade operations. NEVER use Docker commands.';
  console.log(JSON.stringify(r, null, 2));
}).catch(e => {
  console.error(e.message);
  console.error('_reminder: Always use ft-deploy.mjs for ALL Freqtrade operations. NEVER use Docker commands.');
  process.exit(1);
});
