#!/usr/bin/env node
// CCXT Exchange Trading CLI
// Requires: npm install ccxt
import { cli } from '../lib/aicoin-api.mjs';

const SUPPORTED = ['binance','okx','bybit','bitget','gate','htx','kucoin','mexc','coinbase'];

async function getExchange(id, marketType, skipAuth = false) {
  let ccxt;
  try {
    ccxt = await import('ccxt');
  } catch {
    throw new Error('ccxt not installed. Run: cd <skill-dir>/aicoin && npm install');
  }
  const opts = {};
  if (!skipAuth) {
    const pre = id.toUpperCase();
    opts.apiKey = process.env[`${pre}_API_KEY`];
    opts.secret = process.env[`${pre}_API_SECRET`];
    if (process.env[`${pre}_PASSWORD`]) opts.password = process.env[`${pre}_PASSWORD`];
  }
  // Proxy support: PROXY_URL (MCP-compatible) or HTTPS_PROXY/HTTP_PROXY
  const proxyUrl = process.env.PROXY_URL
    || process.env.HTTPS_PROXY || process.env.https_proxy
    || process.env.HTTP_PROXY || process.env.http_proxy
    || process.env.ALL_PROXY || process.env.all_proxy;
  if (proxyUrl) {
    if (proxyUrl.startsWith('socks')) {
      let socksUrl = proxyUrl;
      if (socksUrl.startsWith('socks5://')) socksUrl = socksUrl.replace('socks5://', 'socks5h://');
      else if (socksUrl.startsWith('socks4://')) socksUrl = socksUrl.replace('socks4://', 'socks4a://');
      opts.socksProxy = socksUrl;
    } else {
      opts.httpsProxy = proxyUrl;
    }
  }
  if (marketType && marketType !== 'spot') opts.options = { defaultType: marketType };
  const Ex = ccxt.default?.[id] || ccxt[id];
  return new Ex(opts);
}

cli({
  exchanges: async () => SUPPORTED,
  markets: async ({ exchange, market_type, base, quote, limit = 100 }) => {
    const ex = await getExchange(exchange, market_type, true);
    await ex.loadMarkets();
    let m = Object.values(ex.markets).map(x => ({ symbol: x.symbol, base: x.base, quote: x.quote, type: x.type, active: x.active }));
    if (market_type) m = m.filter(x => x.type === market_type);
    if (base) m = m.filter(x => x.base === base.toUpperCase());
    if (quote) m = m.filter(x => x.quote === quote.toUpperCase());
    return m.slice(0, limit);
  },
  ticker: async ({ exchange, symbol, symbols, market_type }) => {
    const ex = await getExchange(exchange, market_type, true);
    if (symbol) return ex.fetchTicker(symbol);
    return ex.fetchTickers(symbols);
  },
  orderbook: async ({ exchange, symbol, market_type, limit }) => {
    const ex = await getExchange(exchange, market_type, true);
    return ex.fetchOrderBook(symbol, limit);
  },
  trades: async ({ exchange, symbol, market_type, limit }) => {
    const ex = await getExchange(exchange, market_type, true);
    return ex.fetchTrades(symbol, undefined, limit);
  },
  ohlcv: async ({ exchange, symbol, market_type, timeframe = '1h', limit }) => {
    const ex = await getExchange(exchange, market_type, true);
    return ex.fetchOHLCV(symbol, timeframe, undefined, limit);
  },
  balance: async ({ exchange, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    const bal = await ex.fetchBalance();
    // Return only non-zero balances for cleaner output
    const summary = {};
    for (const [ccy, amt] of Object.entries(bal.total || {})) {
      if (Number(amt) > 0) summary[ccy] = { free: bal.free[ccy], used: bal.used[ccy], total: bal.total[ccy] };
    }
    return summary;
  },
  positions: async ({ exchange, symbols, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.fetchPositions(symbols);
  },
  open_orders: async ({ exchange, symbol, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.fetchOpenOrders(symbol);
  },
  create_order: async ({ exchange, symbol, type, side, amount, price, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.createOrder(symbol, type, side, amount, price);
  },
  cancel_order: async ({ exchange, symbol, order_id, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    if (order_id) return ex.cancelOrder(order_id, symbol);
    return ex.cancelAllOrders(symbol);
  },
  set_leverage: async ({ exchange, symbol, leverage, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.setLeverage(leverage, symbol);
  },
  set_margin_mode: async ({ exchange, symbol, margin_mode, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.setMarginMode(margin_mode, symbol);
  },
  transfer: async ({ exchange, code, amount, from_account, to_account }) => {
    const ex = await getExchange(exchange);
    return ex.transfer(code, amount, from_account, to_account);
  },
});
