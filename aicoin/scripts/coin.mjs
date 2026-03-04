#!/usr/bin/env node
// AiCoin Coin Data CLI
import { apiGet, apiPost, cli } from '../lib/aicoin-api.mjs';

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
    const body = { coinKeys: JSON.parse(coin_keys) };
    if (language) body.language = language;
    return apiPost('/api/v2/content/ai-coins', body);
  },
  // coin_funding_rate
  funding_rate: ({ symbol, interval, weighted, limit = '100', start_time, end_time }) => {
    const resolved = resolveSymbol(symbol);
    const p = { symbol: resolved, interval, limit };
    if (start_time) p.start_time = start_time;
    if (end_time) p.end_time = end_time;
    const path = weighted === 'true'
      ? '/api/upgrade/v2/futures/funding-rate/vol-weight-history'
      : '/api/upgrade/v2/futures/funding-rate/history';
    return apiGet(path, p);
  },
  // coin_liquidation
  liquidation_map: ({ dbkey, cycle, leverage }) => {
    const p = { dbkey: resolveDbkey(dbkey), cycle };
    if (leverage) p.leverage = leverage;
    return apiGet('/api/upgrade/v2/futures/liquidation/map', p);
  },
  liquidation_history: ({ symbol, interval, limit = '100', start_time, end_time }) => {
    const p = { symbol: resolveSymbol(symbol), interval, limit };
    if (start_time) p.start_time = start_time;
    if (end_time) p.end_time = end_time;
    return apiGet('/api/upgrade/v2/futures/liquidation/history', p);
  },
  estimated_liquidation: ({ dbkey, cycle, leverage, limit = '5' }) => {
    const p = { dbkey: resolveDbkey(dbkey), cycle, limit };
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
  historical_depth: ({ key, limit = '100' }) => apiGet('/api/upgrade/v2/futures/historical-depth', { key: resolveSymbol(key), limit }),
  super_depth: ({ key, amount = '10000', limit = '100' }) => apiGet('/api/upgrade/v2/futures/super-depth/history', { key: resolveSymbol(key), amount, limit }),
  trade_data: ({ dbkey, limit = '100' }) => apiGet('/api/upgrade/v2/futures/trade-data', { dbkey: resolveDbkey(dbkey), limit }),
});
