#!/usr/bin/env node
// Freqtrade One-Click Deployment via Docker
// Reads exchange keys from .env, creates config, starts container, auto-sets FREQTRADE_* env
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Load .env (same as other scripts)
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
const CONTAINER_NAME = 'freqtrade-bot';
const API_PORT = process.env.FREQTRADE_PORT || '8080';
const ENV_FILE = resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env');

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 120000, ...opts }).trim();
}

function detectExchange() {
  // Check which exchange keys are available
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
    dry_run: params.dry_run !== false, // default to dry-run for safety
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
    entry_pricing: { price_side: 'same', use_order_book: true, order_book_top: 1 },
    exit_pricing: { price_side: 'same', use_order_book: true, order_book_top: 1 },
    api_server: {
      enabled: true,
      listen_ip_address: '0.0.0.0',
      listen_port: 8080,
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

  // Proxy support
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

// ─── Actions ───

const actions = {
  // Check prerequisites
  check: async () => {
    const checks = {};

    // Docker
    try { run('docker --version'); checks.docker = true; } catch { checks.docker = false; }

    // Exchange keys
    const ex = detectExchange();
    checks.exchange = ex ? { name: ex.name, configured: true } : { configured: false };

    // Existing deployment
    try {
      const state = run(`docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null`);
      checks.freqtrade = { deployed: true, status: state };
    } catch {
      checks.freqtrade = { deployed: false };
    }

    checks.ready = checks.docker && checks.exchange?.configured;
    if (!checks.ready) {
      checks.missing = [];
      if (!checks.docker) checks.missing.push('Docker not installed. Install: https://docs.docker.com/get-docker/');
      if (!checks.exchange?.configured) checks.missing.push('No exchange API keys in .env. Add e.g. OKX_API_KEY, OKX_API_SECRET, OKX_PASSWORD');
    }
    return checks;
  },

  // Full deployment
  deploy: async (params = {}) => {
    // 1. Check Docker
    try { run('docker --version'); } catch {
      throw new Error('Docker not installed. Install from https://docs.docker.com/get-docker/');
    }

    // 2. Detect exchange
    const exchangeInfo = detectExchange();
    if (!exchangeInfo) {
      throw new Error('No exchange API keys found in .env. Configure e.g. OKX_API_KEY, OKX_API_SECRET first.');
    }

    // 3. Create directories
    const userDataDir = resolve(FT_DIR, 'user_data');
    const stratDir = resolve(userDataDir, 'strategies');
    mkdirSync(stratDir, { recursive: true });

    // 4. Generate API password and config
    const apiPassword = randomBytes(8).toString('hex');
    const config = generateConfig(exchangeInfo, apiPassword, params);
    const configPath = resolve(userDataDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 5. Create a sample strategy if none exists
    const samplePath = resolve(stratDir, 'SampleStrategy.py');
    if (!existsSync(samplePath)) {
      writeFileSync(samplePath, SAMPLE_STRATEGY);
    }

    // 6. Stop existing container if any
    try { run(`docker stop ${CONTAINER_NAME} 2>/dev/null`); } catch {}
    try { run(`docker rm ${CONTAINER_NAME} 2>/dev/null`); } catch {}

    // 7. Pull latest image
    run('docker pull freqtradeorg/freqtrade:stable', { timeout: 300000 });

    // 8. Start container
    const strategy = params.strategy || 'SampleStrategy';
    run([
      'docker run -d',
      `--name ${CONTAINER_NAME}`,
      `-v ${userDataDir}:/freqtrade/user_data`,
      `-p ${API_PORT}:8080`,
      '--restart unless-stopped',
      'freqtradeorg/freqtrade:stable',
      'trade',
      '--config /freqtrade/user_data/config.json',
      `--strategy ${strategy}`,
    ].join(' '));

    // 9. Write env vars
    appendEnv('FREQTRADE_URL', `http://localhost:${API_PORT}`);
    appendEnv('FREQTRADE_USERNAME', 'freqtrader');
    appendEnv('FREQTRADE_PASSWORD', apiPassword);

    // 10. Wait for startup
    let ready = false;
    for (let i = 0; i < 10; i++) {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const state = run(`docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME}`);
        if (state === 'running') { ready = true; break; }
      } catch {}
    }

    return {
      success: true,
      container: CONTAINER_NAME,
      exchange: exchangeInfo.name,
      strategy,
      dry_run: config.dry_run,
      pairs: config.exchange.pair_whitelist,
      api_url: `http://localhost:${API_PORT}`,
      api_username: 'freqtrader',
      api_password: apiPassword,
      config_path: configPath,
      strategies_dir: stratDir,
      container_running: ready,
      note: config.dry_run
        ? 'Running in DRY-RUN mode (no real money). Use deploy with {"dry_run":false} for live trading.'
        : 'WARNING: Running in LIVE mode with real money!',
    };
  },

  // Check status
  status: async () => {
    try {
      const state = run(`docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME}`);
      const logs = run(`docker logs --tail 5 ${CONTAINER_NAME} 2>&1`);
      return { running: state === 'running', state, last_logs: logs };
    } catch {
      return { running: false, state: 'not deployed' };
    }
  },

  // Stop
  stop: async () => {
    try {
      run(`docker stop ${CONTAINER_NAME}`);
      return { stopped: true };
    } catch (e) {
      return { stopped: false, error: e.message };
    }
  },

  // Start (restart stopped container)
  start: async () => {
    try {
      run(`docker start ${CONTAINER_NAME}`);
      return { started: true };
    } catch (e) {
      return { started: false, error: e.message };
    }
  },

  // View logs
  logs: async ({ lines = 50 } = {}) => {
    try {
      return { logs: run(`docker logs --tail ${lines} ${CONTAINER_NAME} 2>&1`) };
    } catch (e) {
      return { error: e.message };
    }
  },

  // Remove deployment
  remove: async () => {
    try { run(`docker stop ${CONTAINER_NAME} 2>/dev/null`); } catch {}
    try { run(`docker rm ${CONTAINER_NAME} 2>/dev/null`); } catch {}
    return { removed: true, note: 'Container removed. Config and strategies preserved at ~/.freqtrade/' };
  },
};

// ─── Sample strategy ───

const SAMPLE_STRATEGY = `
# Sample strategy for Freqtrade
# Simple RSI + EMA crossover strategy
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta

class SampleStrategy(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = '5m'
    can_short = True

    # ROI table
    minimal_roi = {"0": 0.05, "30": 0.03, "60": 0.02, "120": 0.01}

    # Stoploss
    stoploss = -0.03
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        dataframe['ema_fast'] = ta.EMA(dataframe, timeperiod=8)
        dataframe['ema_slow'] = ta.EMA(dataframe, timeperiod=21)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Long entry
        dataframe.loc[
            (dataframe['rsi'] < 35) &
            (dataframe['ema_fast'] > dataframe['ema_slow']) &
            (dataframe['volume'] > 0),
            'enter_long'] = 1
        # Short entry
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
`.trim() + '\\n';

// ─── CLI ───

const [action, ...rest] = process.argv.slice(2);
if (!action || !actions[action]) {
  console.log(`Usage: node ft-deploy.mjs <action> [json-params]
Actions: ${Object.keys(actions).join(', ')}`);
  process.exit(1);
}
const params = rest.length ? JSON.parse(rest.join(' ')) : {};
actions[action](params).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => {
  console.error(e.message);
  process.exit(1);
});
