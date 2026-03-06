#!/usr/bin/env node
// CCXT Exchange Trading CLI
// Requires: npm install ccxt
import { cli } from '../lib/aicoin-api.mjs';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

const SUPPORTED = ['binance','okx','bybit','bitget','gate','htx','pionex','hyperliquid'];

// AiCoin referral links — shown in exchanges list and missing-key errors
const REFERRALS = {
  okx:         { name: 'OKX',         code: 'aicoin20',  benefit: '永久返20%手续费', link: 'https://jump.do/zh-Hans/xlink-proxy?id=2' },
  binance:     { name: 'Binance',     code: 'aicoin668', benefit: '返10% + $500',   link: 'https://jump.do/zh-Hans/xlink-proxy?id=3' },
  bitget:      { name: 'Bitget',      code: 'hktb3191',  benefit: '返10%手续费',     link: 'https://jump.do/zh-Hans/xlink-proxy?id=6' },
  htx:         { name: 'HTX',         code: 'j2us6223',  benefit: '',               link: 'https://jump.do/zh-Hans/xlink-proxy?id=4' },
  gate:        { name: 'Gate.io',     code: 'AICOINGO',  benefit: '',               link: 'https://jump.do/zh-Hans/xlink-proxy?id=5' },
  bybit:       { name: 'Bybit',       code: '34429',     benefit: '',               link: 'https://jump.do/zh-Hans/xlink-proxy?id=15' },
  pionex:      { name: 'Pionex',      code: '4vgi0zUF',  benefit: '',               link: 'https://www.pionex.com/zh-CN/signUp?r=4vgi0zUF' },
  hyperliquid: { name: 'Hyperliquid', code: 'AICOIN88',  benefit: '返4%手续费',      link: 'https://app.hyperliquid.xyz/join/AICOIN88' },
};

const SECURITY_NOTICE = '⚠️ AiCoin API Key 与交易所 API Key 是完全独立的两套密钥：(1) AiCoin API Key 仅用于获取市场数据（行情、K线、资金费率等），无法进行任何交易操作，也无法读取你在交易所的任何信息。(2) 交易所 API Key 需要单独到各交易所后台申请和授权。(3) 所有密钥仅保存在本地设备 .env 文件中，不会上传到任何服务器。';

// AiCoin broker tags — ensures orders are attributed to AiCoin, not CCXT default
const BROKER_CONFIG = {
  binance: {
    options: { broker: { spot: 'x-MGFCMH4U', margin: 'x-MGFCMH4U', future: 'x-FaeSBrMa', swap: 'x-FaeSBrMa', delivery: 'x-FaeSBrMa' } },
  },
  okx: {
    options: { brokerId: 'c6851dd5f01e4aBC' },
  },
  bybit: {
    options: { brokerId: 'AiCoin' },
  },
  bitget: {
    options: { broker: 'tpequ' },
  },
  gate: {
    headers: { 'X-Gate-Channel-Id': 'AiCoin1' },
  },
  htx: {
    options: { broker: { id: 'AAf0e4f2ef' } },
  },
};

async function getExchange(id, marketType, skipAuth = false) {
  let ccxt;
  try {
    ccxt = await import('ccxt');
  } catch {
    // Auto-install ccxt if missing
    try {
      execSync('npm install --omit=dev', { cwd: resolve(__dir, '..'), stdio: 'pipe', timeout: 60000 });
      ccxt = await import('ccxt');
    } catch {
      throw new Error('ccxt not installed. Run: cd <skill-dir>/aicoin && npm install');
    }
  }
  const opts = {};
  if (!skipAuth) {
    const pre = id.toUpperCase();
    opts.apiKey = process.env[`${pre}_API_KEY`];
    opts.secret = process.env[`${pre}_API_SECRET`] || process.env[`${pre}_SECRET`];
    if (process.env[`${pre}_PASSWORD`] || process.env[`${pre}_PASSPHRASE`]) {
      opts.password = process.env[`${pre}_PASSWORD`] || process.env[`${pre}_PASSPHRASE`];
    }
    if (!opts.apiKey) {
      const ref = REFERRALS[id] || {};
      throw new Error(
        `未配置 ${ref.name || id} 交易所 API Key。` +
        (ref.link ? `\n注册${ref.name}（AiCoin专属优惠）：${ref.link}\n邀请码：${ref.code}${ref.benefit ? '，' + ref.benefit : ''}` : '') +
        `\n配置方法：在 .env 文件中添加 ${pre}_API_KEY=xxx 和 ${pre}_API_SECRET=xxx` +
        `\n${SECURITY_NOTICE}`
      );
    }
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
    } else if (proxyUrl.startsWith('https://')) {
      opts.httpsProxy = proxyUrl;
    } else {
      opts.httpProxy = proxyUrl;
    }
  }
  // Set market type
  if (marketType && marketType !== 'spot') {
    opts.options = { ...(opts.options || {}), defaultType: marketType };
  }
  // Apply AiCoin broker tags (overrides CCXT defaults)
  const brokerCfg = BROKER_CONFIG[id];
  if (brokerCfg) {
    if (brokerCfg.options) {
      opts.options = { ...(opts.options || {}), ...brokerCfg.options };
    }
    if (brokerCfg.headers) {
      opts.headers = { ...(opts.headers || {}), ...brokerCfg.headers };
    }
  }
  const Ex = ccxt.default?.[id] || ccxt[id];
  return new Ex(opts);
}

cli({
  exchanges: async () => ({
    supported: SUPPORTED.map(id => {
      const ref = REFERRALS[id] || {};
      return { exchange: id, name: ref.name || id, register_link: ref.link || '', invite_code: ref.code || '', benefit: ref.benefit || '' };
    }),
    security_notice: SECURITY_NOTICE,
  }),
  register: async ({ exchange: exName }) => {
    if (!exName) return { exchanges: Object.keys(REFERRALS), usage: 'node exchange.mjs register \'{"exchange":"okx"}\'' };
    const key = exName.toLowerCase().replace(/[.\s]/g, '');
    const ALIASES = { 币安: 'binance', 火币: 'htx', 派网: 'pionex', hl: 'hyperliquid', gateio: 'gate' };
    const id = ALIASES[key] || key;
    const ref = REFERRALS[id];
    if (!ref) return { error: `不支持 ${exName}`, supported: Object.keys(REFERRALS) };
    return {
      exchange: ref.name, invite_code: ref.code, benefit: ref.benefit || '无额外优惠', register_link: ref.link,
      steps: ['打开注册链接', '选择手机或邮箱注册', '填入验证码、设置密码', '完成身份验证(KYC)', '如需API交易，到API管理创建key，配置到.env'],
      security_notice: SECURITY_NOTICE,
    };
  },
  markets: async ({ exchange, market_type, base, quote, limit = 100 }) => {
    const ex = await getExchange(exchange, market_type, true);
    await ex.loadMarkets();
    let m = Object.values(ex.markets).map(x => ({
      symbol: x.symbol, base: x.base, quote: x.quote, type: x.type, active: x.active,
      contractSize: x.contractSize || null,
      limits: x.limits || null,
      precision: x.precision || null,
    }));
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
  balance: async ({ exchange, market_type, show_dust }) => {
    const ex = await getExchange(exchange, market_type);
    const bal = await ex.fetchBalance();
    // Return only non-zero balances for cleaner output
    const summary = {};
    for (const [ccy, amt] of Object.entries(bal.total || {})) {
      const total = Number(amt);
      if (total <= 0) continue;
      // Filter dust tokens (< $0.01 equivalent) unless show_dust is set
      // Stablecoins check: if < 0.01, it's dust
      const isStable = ['USDT','USDC','BUSD','DAI','TUSD','FDUSD'].includes(ccy);
      if (!show_dust && isStable && total < 0.01) continue;
      if (!show_dust && !isStable && total < 1e-7) continue;
      summary[ccy] = { free: bal.free[ccy], used: bal.used[ccy], total: bal.total[ccy] };
    }
    // OKX unified account note
    if (exchange === 'okx') {
      summary._note = 'OKX统一账户：现货和合约共用同一余额，无需划转。';
    }
    return summary;
  },
  positions: async ({ exchange, symbols, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    const all = await ex.fetchPositions(symbols);
    // Filter out zero-size positions (Binance returns 100+ empty entries)
    return all.filter(p => Math.abs(Number(p.contracts || 0)) > 0);
  },
  open_orders: async ({ exchange, symbol, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    if (symbol) return ex.fetchOpenOrders(symbol);
    try {
      return await ex.fetchOpenOrders();
    } catch (err) {
      if (err.message?.includes('symbol') || err.message?.includes('argument')) {
        throw new Error(`${exchange} 查询未成交订单需要指定交易对，例如: {"symbol":"BTC/USDT"}`);
      }
      throw err;
    }
  },
  closed_orders: async ({ exchange, symbol, market_type, since, limit = 50 }) => {
    const ex = await getExchange(exchange, market_type);
    const sinceTs = since ? new Date(since).getTime() : undefined;
    return ex.fetchClosedOrders(symbol, sinceTs, Number(limit));
  },
  my_trades: async ({ exchange, symbol, market_type, since, limit = 50 }) => {
    const ex = await getExchange(exchange, market_type);
    const sinceTs = since ? new Date(since).getTime() : undefined;
    return ex.fetchMyTrades(symbol, sinceTs, Number(limit));
  },
  fetch_order: async ({ exchange, symbol, order_id, market_type }) => {
    const ex = await getExchange(exchange, market_type);
    return ex.fetchOrder(order_id, symbol);
  },
  create_order: async ({ exchange, symbol, type, side, amount, price, market_type, params, confirmed }) => {
    const pendingFile = resolve(__dir, '..', '.pending-order.json');

    // Internal calls (from auto-trade.mjs) bypass file-based confirmation
    const isInternal = process.env.AICOIN_INTERNAL_CALL === '1';

    // Step 2: Confirmation — only works if a pending order file exists from Step 1
    if (confirmed === 'true' || confirmed === true) {
      if (isInternal) {
        // Internal call: execute directly with provided params
        const ex = await getExchange(exchange, market_type);
        const orderParams = { ...(params || {}) };
        if (exchange === 'okx' && market_type && market_type !== 'spot' && !orderParams.posSide) {
          if (orderParams.reduceOnly) {
            orderParams.posSide = side === 'buy' ? 'short' : 'long';
          } else {
            orderParams.posSide = side === 'buy' ? 'long' : 'short';
          }
        }
        const order = await ex.createOrder(symbol, type, side, amount, price, orderParams);
        if (market_type && market_type !== 'spot') {
          try {
            await ex.loadMarkets();
            const mkt = ex.markets[symbol];
            if (mkt?.contractSize) {
              order._contractSize = mkt.contractSize;
              order._amountInBase = amount * mkt.contractSize;
              order._unit = `${amount} contracts × ${mkt.contractSize} ${mkt.base}/contract = ${amount * mkt.contractSize} ${mkt.base}`;
            }
          } catch {}
        }
        return order;
      }

      let pending;
      try { pending = JSON.parse(readFileSync(pendingFile, 'utf8')); }
      catch { throw new Error('没有待确认的订单。请先不带 confirmed 参数调用 create_order 来预览订单，等用户确认后再重新调用并带上 confirmed=true。'); }

      // Expire after 5 minutes
      if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
        try { unlinkSync(pendingFile); } catch {}
        throw new Error('订单预览已过期（超过5分钟），请重新创建订单预览。');
      }

      try { unlinkSync(pendingFile); } catch {}

      // Execute with stored params (prevents model from tampering between preview and confirm)
      const ex = await getExchange(pending.exchange, pending.market_type);
      const orderParams = { ...(pending.params || {}) };
      if (pending.exchange === 'okx' && pending.market_type && pending.market_type !== 'spot' && !orderParams.posSide) {
        if (orderParams.reduceOnly) {
          orderParams.posSide = pending.side === 'buy' ? 'short' : 'long';
        } else {
          orderParams.posSide = pending.side === 'buy' ? 'long' : 'short';
        }
      }
      const order = await ex.createOrder(pending.symbol, pending.type, pending.side, pending.amount, pending.price, orderParams);
      if (pending.market_type && pending.market_type !== 'spot') {
        try {
          await ex.loadMarkets();
          const mkt = ex.markets[pending.symbol];
          if (mkt?.contractSize) {
            order._contractSize = mkt.contractSize;
            order._amountInBase = pending.amount * mkt.contractSize;
            order._unit = `${pending.amount} contracts × ${mkt.contractSize} ${mkt.base}/contract = ${pending.amount * mkt.contractSize} ${mkt.base}`;
          }
        } catch {}
      }
      return order;
    }

    // Step 1: Preview — save pending order to file, return preview
    const ex = await getExchange(exchange, market_type);
    await ex.loadMarkets();
    const mkt = ex.markets[symbol];
    const pendingOrder = { exchange, symbol, type, side, amount, price, market_type, params, timestamp: Date.now() };
    writeFileSync(pendingFile, JSON.stringify(pendingOrder));

    const preview = {
      _preview: true,
      _message: '⚠️ Order NOT placed. Show this preview to the user and wait for their explicit confirmation (e.g. "确认" or "yes"). Then re-run with confirmed=true.',
      exchange, symbol, type, side, amount, price: price || 'market',
      market_type: market_type || 'spot',
    };
    if (mkt?.contractSize) {
      preview._contractSize = mkt.contractSize;
      preview._amountInBase = amount * mkt.contractSize;
      preview._unit = `${amount} contracts × ${mkt.contractSize} ${mkt.base}/contract = ${amount * mkt.contractSize} ${mkt.base}`;
    }
    return preview;
  },
  funding_rate: async ({ exchange, symbol, market_type }) => {
    const ex = await getExchange(exchange, market_type || 'swap', true);
    return ex.fetchFundingRate(symbol);
  },
  funding_rates: async ({ symbol, exchanges: exList, market_type }) => {
    const list = exList ? exList.split(',').map(s => s.trim()) : SUPPORTED;
    const sym = symbol || 'BTC/USDT:USDT';
    const results = await Promise.allSettled(
      list.map(async id => {
        try {
          const ex = await getExchange(id, market_type || 'swap', true);
          const r = await ex.fetchFundingRate(sym);
          return { exchange: id, symbol: sym, fundingRate: r.fundingRate, fundingDatetime: r.fundingDatetime, markPrice: r.markPrice };
        } catch (e) {
          return { exchange: id, symbol: sym, error: e.message };
        }
      })
    );
    const rates = results.map(r => r.status === 'fulfilled' ? r.value : { exchange: 'unknown', error: r.reason?.message });
    const valid = rates.filter(r => !r.error && r.fundingRate != null);
    if (valid.length >= 2) {
      valid.sort((a, b) => a.fundingRate - b.fundingRate);
      const spread = valid[valid.length - 1].fundingRate - valid[0].fundingRate;
      return { rates, arbitrage: { lowestRate: valid[0], highestRate: valid[valid.length - 1], spread, spreadPct: (spread * 100).toFixed(6) + '%', annualized: (spread * 3 * 365 * 100).toFixed(2) + '%' } };
    }
    return { rates, arbitrage: null, _note: 'Need at least 2 successful rate queries to calculate arbitrage spread' };
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
  set_margin_mode: async ({ exchange, symbol, margin_mode, market_type, leverage }) => {
    const ex = await getExchange(exchange, market_type);
    try {
      const modeParams = exchange === 'okx' && leverage ? { lever: String(leverage) } : {};
      if (exchange === 'okx' && margin_mode === 'isolated') {
        const results = [];
        for (const ps of ['long', 'short']) {
          try {
            results.push(await ex.setMarginMode(margin_mode, symbol, { ...modeParams, posSide: ps }));
          } catch (e) {
            const m = e.message || String(e);
            if (m.includes('already') || m.includes('No need')) results.push({ posSide: ps, unchanged: true });
            else throw e;
          }
        }
        return { success: true, margin_mode, results };
      }
      const res = await ex.setMarginMode(margin_mode, symbol, modeParams);
      if (res?.code === -4046 || res?.msg?.includes('No need to change')) {
        return { success: true, margin_mode, message: `已经是 ${margin_mode} 模式，无需切换。` };
      }
      return res;
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('-4046') || msg.includes('No need to change')) {
        return { success: true, margin_mode, message: `已经是 ${margin_mode} 模式，无需切换。` };
      }
      throw err;
    }
  },
  transfer: async ({ exchange, code, amount, from_account, to_account }) => {
    // OKX unified account: no transfer needed
    if (exchange === 'okx') {
      return {
        success: false,
        reason: 'OKX_UNIFIED_ACCOUNT',
        message: 'OKX 是统一账户，现货和合约共用同一个余额，不需要划转。直接下单即可。',
      };
    }
    const ex = await getExchange(exchange);
    // Normalize account names to CCXT-recognized keys
    // CCXT Binance only accepts: spot/main, future, delivery, margin/cross, linear, swap, inverse, funding, option
    // AI agents may say "futures", "usdm", "coinm" etc. which CCXT misinterprets as isolated margin symbols
    const ALIAS = { futures: 'future', usdm: 'future', coinm: 'delivery' };
    const fromRaw = from_account.toLowerCase();
    const toRaw = to_account.toLowerCase();
    const from = ALIAS[fromRaw] || fromRaw;
    const to = ALIAS[toRaw] || toRaw;
    try {
      return await ex.transfer(code, amount, from, to);
    } catch (err) {
      const msg = err.message || String(err);
      // Binance: API key lacks Universal Transfer permission
      if (exchange === 'binance' && (msg.includes('-1002') || msg.includes('not authorized'))) {
        throw new Error(`Binance 划转失败: API Key 没有万向划转(Universal Transfer)权限。请在 Binance API 管理后台开启「Permits Universal Transfer / 允许万向划转」权限。原始错误: ${msg}`);
      }
      throw err;
    }
  },
});
