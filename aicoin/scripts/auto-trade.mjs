#!/usr/bin/env node
// Automated Trading — fetch market data, score signals, execute trades
// Uses aicoin-api for data, shells out to exchange.mjs for trades
import { apiGet, apiPost, cli } from '../lib/aicoin-api.mjs';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(process.env.HOME || '', '.openclaw', 'workspace');
const CONFIG_PATH = resolve(WORKSPACE, 'aicoin-trade-config.json');

const DEFAULT_CONFIG = {
  exchange: 'okx',
  symbol: 'BTC/USDT:USDT',     // CCXT trading pair
  market_type: 'swap',
  aicoin_kline: 'btcusdt:okex', // AiCoin kline symbol
  aicoin_funding: 'btcswapusdt:binance',
  aicoin_oi: 'BTC',
  capital_pct: 0.5,              // % of balance per trade
  leverage: 20,
  stop_loss_pct: 0.025,          // 2.5% stop loss
  take_profit_pct: 0.05,         // 5% take profit
  min_score: 2,                  // minimum signal score to open position
  ma_period: 20,                 // MA period for trend
};

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }; } catch {}
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function exchange(action, params) {
  const cmd = `node ${resolve(__dir, 'exchange.mjs')} ${action} '${JSON.stringify(params)}'`;
  const out = execSync(cmd, { encoding: 'utf-8', cwd: resolve(__dir, '..'), timeout: 30000 });
  return JSON.parse(out);
}

// ─── Data fetching ───

async function fetchKlines(cfg) {
  const res = await apiGet('/api/data/kline', {
    symbol: cfg.aicoin_kline,
    period: '3600',
    size: String(Math.max(cfg.ma_period + 5, 30)),
  });
  return (res.data || []).map(k => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    vol: Number(k[5]),
  }));
}

async function fetchFunding(cfg) {
  const res = await apiGet('/api/data/funding-rate', {
    symbol: cfg.aicoin_funding,
    interval: '8h',
    limit: '3',
  });
  const items = res.data || [];
  if (!items.length) return null;
  return Number(items[items.length - 1]?.[1] || 0);
}

async function fetchOI(cfg) {
  const res = await apiGet('/api/data/open-interest', {
    symbol: cfg.aicoin_oi,
    interval: '15m',
    limit: '10',
  });
  const items = res.data || [];
  if (items.length < 2) return null;
  const latest = Number(items[items.length - 1]?.[1] || 0);
  const prev = Number(items[items.length - 2]?.[1] || 0);
  return { latest, prev, change: prev ? (latest - prev) / prev : 0 };
}

// ─── Signal scoring ───

function scoreSignals(klines, funding, oi, cfg) {
  const signals = [];
  let score = 0;

  if (klines.length < cfg.ma_period) {
    return { score: 0, signals: ['Not enough kline data'], direction: 'HOLD' };
  }

  // MA trend
  const closes = klines.slice(-cfg.ma_period).map(k => k.close);
  const ma = closes.reduce((a, b) => a + b, 0) / closes.length;
  const price = klines[klines.length - 1].close;

  if (price > ma * 1.005) {
    score += 1;
    signals.push(`Price ${price.toFixed(0)} > MA${cfg.ma_period} ${ma.toFixed(0)} → bullish`);
  } else if (price < ma * 0.995) {
    score -= 1;
    signals.push(`Price ${price.toFixed(0)} < MA${cfg.ma_period} ${ma.toFixed(0)} → bearish`);
  } else {
    signals.push(`Price ${price.toFixed(0)} ≈ MA${cfg.ma_period} ${ma.toFixed(0)} → neutral`);
  }

  // Volume spike
  const vols = klines.slice(-cfg.ma_period).map(k => k.vol);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
  const latestVol = klines[klines.length - 1].vol;
  if (latestVol > avgVol * 2) {
    score += price > ma ? 1 : -1;
    signals.push(`Volume spike ${(latestVol / avgVol).toFixed(1)}x avg → confirms move`);
  }

  // Funding rate
  if (funding !== null) {
    if (funding > 0.0005) {
      score -= 1;
      signals.push(`Funding ${(funding * 100).toFixed(4)}% → longs crowded, reversal risk`);
    } else if (funding < -0.0003) {
      score += 1;
      signals.push(`Funding ${(funding * 100).toFixed(4)}% → shorts crowded, squeeze risk`);
    } else {
      signals.push(`Funding ${(funding * 100).toFixed(4)}% → neutral`);
    }
  }

  // OI change
  if (oi) {
    if (oi.change > 0.02 && price > ma) {
      score += 1;
      signals.push(`OI +${(oi.change * 100).toFixed(1)}% with price up → new longs entering`);
    } else if (oi.change > 0.02 && price < ma) {
      score -= 1;
      signals.push(`OI +${(oi.change * 100).toFixed(1)}% with price down → new shorts entering`);
    } else if (oi.change < -0.02) {
      signals.push(`OI ${(oi.change * 100).toFixed(1)}% → positions closing`);
    }
  }

  const direction = score >= cfg.min_score ? 'LONG' : score <= -cfg.min_score ? 'SHORT' : 'HOLD';
  return { score, signals, direction, price, ma };
}

// ─── Trade execution ───

function executeTrade(cfg, direction, price) {
  // Get balance
  const bal = exchange('balance', { exchange: cfg.exchange, market_type: cfg.market_type });
  const usdt = Number(bal.USDT?.free || 0);
  if (usdt < 1) return { executed: false, reason: `Insufficient balance: ${usdt} USDT` };

  // Check market minimums
  const mkts = exchange('markets', {
    exchange: cfg.exchange,
    market_type: cfg.market_type,
    base: cfg.symbol.split('/')[0],
  });
  const mkt = mkts.find(m => m.symbol === cfg.symbol);
  if (!mkt) return { executed: false, reason: `Market ${cfg.symbol} not found` };

  // Calculate position size
  const capital = usdt * cfg.capital_pct;
  const positionValue = capital * cfg.leverage;
  const amount = positionValue / price;

  // Set leverage
  try {
    exchange('set_leverage', {
      exchange: cfg.exchange,
      symbol: cfg.symbol,
      leverage: cfg.leverage,
      market_type: cfg.market_type,
    });
  } catch (e) {
    // Some exchanges don't support set_leverage, continue
  }

  // Place market order
  const side = direction === 'LONG' ? 'buy' : 'sell';
  const order = exchange('create_order', {
    exchange: cfg.exchange,
    symbol: cfg.symbol,
    type: 'market',
    side,
    amount: Number(amount.toPrecision(4)),
    market_type: cfg.market_type,
  });

  // Place stop-loss and take-profit
  const slPrice = direction === 'LONG'
    ? price * (1 - cfg.stop_loss_pct)
    : price * (1 + cfg.stop_loss_pct);
  const tpPrice = direction === 'LONG'
    ? price * (1 + cfg.take_profit_pct)
    : price * (1 - cfg.take_profit_pct);

  let sl, tp;
  try {
    const slSide = direction === 'LONG' ? 'sell' : 'buy';
    sl = exchange('create_order', {
      exchange: cfg.exchange,
      symbol: cfg.symbol,
      type: 'limit',
      side: slSide,
      amount: Number(amount.toPrecision(4)),
      price: Number(slPrice.toPrecision(6)),
      market_type: cfg.market_type,
    });
  } catch (e) { sl = { error: e.message }; }

  try {
    const tpSide = direction === 'LONG' ? 'sell' : 'buy';
    tp = exchange('create_order', {
      exchange: cfg.exchange,
      symbol: cfg.symbol,
      type: 'limit',
      side: tpSide,
      amount: Number(amount.toPrecision(4)),
      price: Number(tpPrice.toPrecision(6)),
      market_type: cfg.market_type,
    });
  } catch (e) { tp = { error: e.message }; }

  return {
    executed: true,
    direction,
    amount: Number(amount.toPrecision(4)),
    entry_price: price,
    stop_loss: Number(slPrice.toPrecision(6)),
    take_profit: Number(tpPrice.toPrecision(6)),
    order_id: order.id,
    sl_order: sl?.id || sl?.error,
    tp_order: tp?.id || tp?.error,
  };
}

// ─── CLI handlers ───

cli({
  // Analyze market, output signal — does NOT trade
  analyze: async (params) => {
    const cfg = { ...loadConfig(), ...params };
    const [klines, funding, oi] = await Promise.all([
      fetchKlines(cfg),
      fetchFunding(cfg),
      fetchOI(cfg),
    ]);
    return scoreSignals(klines, funding, oi, cfg);
  },

  // Analyze + trade if signal is strong enough
  trade: async (params) => {
    const cfg = { ...loadConfig(), ...params };
    const [klines, funding, oi] = await Promise.all([
      fetchKlines(cfg),
      fetchFunding(cfg),
      fetchOI(cfg),
    ]);
    const analysis = scoreSignals(klines, funding, oi, cfg);

    if (analysis.direction === 'HOLD') {
      return { ...analysis, trade: { executed: false, reason: `Score ${analysis.score} below threshold ±${cfg.min_score}` } };
    }

    // Check for existing positions before opening new ones
    try {
      const positions = exchange('positions', {
        exchange: cfg.exchange,
        market_type: cfg.market_type,
      });
      const active = positions.filter(p =>
        p.symbol === cfg.symbol && Number(p.contracts || p.contractSize || 0) > 0
      );
      if (active.length > 0) {
        return { ...analysis, trade: { executed: false, reason: 'Already have an open position', positions: active } };
      }
    } catch {}

    const trade = executeTrade(cfg, analysis.direction, analysis.price);
    return { ...analysis, trade };
  },

  // Save config
  setup: async (params) => {
    const cfg = { ...loadConfig(), ...params };
    saveConfig(cfg);
    return { saved: CONFIG_PATH, config: cfg };
  },

  // Show current config + balance + positions
  status: async (params) => {
    const cfg = { ...loadConfig(), ...params };
    let balance, positions;
    try { balance = exchange('balance', { exchange: cfg.exchange, market_type: cfg.market_type }); } catch (e) { balance = { error: e.message }; }
    try { positions = exchange('positions', { exchange: cfg.exchange, market_type: cfg.market_type }); } catch (e) { positions = { error: e.message }; }
    return { config: cfg, balance, positions };
  },
});
