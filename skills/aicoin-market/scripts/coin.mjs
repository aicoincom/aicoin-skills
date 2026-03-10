#!/usr/bin/env node
// AiCoin Coin Data CLI
import { apiGet, apiPost, cli } from '../lib/aicoin-api.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Symbol alias mapping: fuzzy input → AiCoin internal format
// Covers funding_rate, liquidation, depth, etc.
const SYMBOL_ALIASES = {
  // BTC
  'btc': 'btcswapusdt:binance', 'bitcoin': 'btcswapusdt:binance',
  'btcusdt': 'btcswapusdt:binance', 'btc/usdt': 'btcswapusdt:binance',
  'btcswapusdt': 'btcswapusdt:binance',
  // ETH
  'eth': 'ethswapusdt:binance', 'ethereum': 'ethswapusdt:binance',
  'ethusdt': 'ethswapusdt:binance', 'eth/usdt': 'ethswapusdt:binance',
  'ethswapusdt': 'ethswapusdt:binance',
  // SOL
  'sol': 'solswapusdt:binance', 'solana': 'solswapusdt:binance',
  'solusdt': 'solswapusdt:binance', 'sol/usdt': 'solswapusdt:binance',
  // DOGE
  'doge': 'dogeswapusdt:binance', 'dogecoin': 'dogeswapusdt:binance',
  'dogeusdt': 'dogeswapusdt:binance',
  // XRP
  'xrp': 'xrpswapusdt:binance', 'xrpusdt': 'xrpswapusdt:binance',
};

function resolveSymbol(symbol) {
  if (!symbol) return symbol;
  // Already in correct format (contains colon)
  if (symbol.includes(':')) return symbol;
  const key = symbol.toLowerCase().replace(/[\s/]/g, '');
  return SYMBOL_ALIASES[key] || symbol;
}

// dbkey alias (same format as symbol for most cases)
function resolveDbkey(dbkey) {
  return resolveSymbol(dbkey);
}

cli({
  // coin_info
  coin_list: () => apiGet('/api/v2/coin'),
  coin_ticker: ({ coin_list }) => apiGet('/api/v2/coin/ticker', { coin_list }),
  coin_config: ({ coin_list }) => apiGet('/api/v2/coin/config', { coin_list }),
  ai_analysis: ({ coin_keys, language }) => {
    let keys = coin_keys;
    if (typeof keys === 'string') {
      try { keys = JSON.parse(keys); } catch { keys = [keys]; }
    }
    if (!Array.isArray(keys)) keys = [keys];
    const body = { coinKeys: keys };
    if (language) body.language = language;
    return apiPost('/api/v2/content/ai-coins', body);
  },
  // coin_funding_rate (AiCoin API only supports BTC)
  funding_rate: ({ symbol, interval = '8h', weighted, limit = '100', start_time, end_time }) => {
    const resolved = resolveSymbol(symbol);
    // Check if resolved symbol is BTC-related
    if (resolved && !resolved.toLowerCase().startsWith('btc')) {
      return Promise.resolve({
        code: '0', msg: 'success', data: [],
        _note: `AiCoin funding_rate API only supports BTC. For ${symbol} funding rate, use: node scripts/exchange.mjs funding_rate '{"exchange":"binance","symbol":"${symbol}/USDT:USDT"}'`
      });
    }
    const p = { symbol: resolved, interval, limit };
    if (start_time) p.start_time = start_time;
    if (end_time) p.end_time = end_time;
    const path = weighted === 'true'
      ? '/api/upgrade/v2/futures/funding-rate/vol-weight-history'
      : '/api/upgrade/v2/futures/funding-rate/history';
    return apiGet(path, p);
  },
  // coin_liquidation
  liquidation_map: ({ symbol, dbkey, cycle, leverage }) => {
    const p = { dbkey: resolveDbkey(symbol || dbkey), cycle };
    if (leverage) p.leverage = leverage;
    return apiGet('/api/upgrade/v2/futures/liquidation/map', p);
  },
  liquidation_history: ({ symbol, interval, limit = '100', start_time, end_time }) => {
    const p = { symbol: resolveSymbol(symbol), interval, limit };
    if (start_time) p.start_time = start_time;
    if (end_time) p.end_time = end_time;
    return apiGet('/api/upgrade/v2/futures/liquidation/history', p);
  },
  estimated_liquidation: ({ symbol, dbkey, cycle, leverage, limit = '5' }) => {
    const p = { dbkey: resolveDbkey(symbol || dbkey), cycle, limit };
    if (leverage) p.leverage = leverage;
    return apiGet('/api/upgrade/v2/futures/estimated-liquidation/history', p);
  },
  // coin_open_interest
  open_interest: ({ symbol, interval, margin_type = 'stablecoin', limit = '100' }) => {
    const path = margin_type === 'coin'
      ? '/api/upgrade/v2/futures/open-interest/aggregated-coin-margin-history'
      : '/api/upgrade/v2/futures/open-interest/aggregated-stablecoin-history';
    return apiGet(path, { symbol, interval, limit });
  },
  // coin_futures_data
  historical_depth: ({ symbol, key, limit = '100' }) => apiGet('/api/upgrade/v2/futures/historical-depth', { key: resolveSymbol(symbol || key), limit }),
  super_depth: ({ symbol, key, amount = '10000', limit = '100' }) => apiGet('/api/upgrade/v2/futures/super-depth/history', { key: resolveSymbol(symbol || key), amount, limit }),
  trade_data: ({ symbol, dbkey, limit = '100' }) => apiGet('/api/upgrade/v2/futures/trade-data', { dbkey: resolveDbkey(symbol || dbkey), limit }),

  // Aliases: actions models often mis-route here from features.mjs
  big_orders: ({ symbol }) => apiGet('/api/v2/order/bigOrder', { symbol: resolveSymbol(symbol) }),
  whale_orders: ({ symbol }) => apiGet('/api/v2/order/bigOrder', { symbol: resolveSymbol(symbol) }),
  ls_ratio: () => apiGet('/api/v2/mix/ls-ratio'),
  long_short_ratio: () => apiGet('/api/v2/mix/ls-ratio'),

  // API Key status check — run this when user asks about AiCoin API key config/safety
  api_key_info: async () => {
    const envPaths = [
      resolve(process.cwd(), '.env'),
      resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env'),
      resolve(process.env.HOME || '', '.openclaw', '.env'),
    ];
    let keyInfo = { configured: false };
    for (const file of envPaths) {
      if (!existsSync(file)) continue;
      try {
        const lines = readFileSync(file, 'utf-8').split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('AICOIN_ACCESS_KEY_ID=')) {
            const val = line.trim().split('=')[1]?.trim().replace(/^["']|["']$/g, '');
            if (val) keyInfo = { configured: true, key_preview: val.slice(0, 8) + '...', env_file: file };
          }
        }
      } catch {}
    }
    return {
      aicoin_key_status: keyInfo.configured
        ? keyInfo
        : { configured: false, setup: '访问 https://www.aicoin.com/opendata 注册 → 创建API Key → 添加到 .env: AICOIN_ACCESS_KEY_ID=xxx / AICOIN_ACCESS_SECRET=xxx' },
      security_notice: '⚠️ AiCoin API Key 与交易所 API Key 是完全独立的两套密钥：(1) AiCoin API Key 仅用于获取市场数据（行情、K线、资金费率等），无法进行任何交易操作，也无法读取你在交易所的任何信息。(2) 如需在交易所下单交易，需要单独到各交易所后台申请交易 API Key。(3) 所有密钥仅保存在你的本地设备 .env 文件中，不会上传到任何服务器。',
    };
  },
});
