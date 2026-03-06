---
name: aicoin-market
description: "This skill should be used when the user asks about crypto prices, market data, K-line charts, funding rates, open interest, long/short ratios, whale orders, liquidation data, crypto news, newsflash, Twitter crypto tweets, trending coins, stock quotes, treasury holdings, or any crypto market query. Use when user says: 'BTC price', 'check price', 'show K-line', 'funding rate', 'open interest', 'whale orders', 'long/short ratio', 'crypto news', 'newsflash', 'trending coins', '查行情', '看价格', '大饼多少钱', 'K线', '资金费率', '多空比', '鲸鱼单', '新闻快讯', '热门币', 'liquidation map'. Covers 200+ exchanges with real-time data. MUST run node scripts to fetch real data. NEVER generate fake prices or hallucinate market data. For exchange trading (buy/sell/balance), use aicoin-trading instead. For Freqtrade strategies/backtest, use aicoin-freqtrade. For Hyperliquid whale analytics, use aicoin-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/coinos-skills", "license": "MIT" } }
---

# CoinOS Market

Crypto market data toolkit powered by [AiCoin Open API](https://www.aicoin.com/opendata). Prices, K-lines, news, signals, whale orders, and more from 200+ exchanges.

**Version:** 1.0.0

## Critical Rules

1. **NEVER fabricate data.** Always run scripts to fetch real-time data.
2. **NEVER use curl, web_fetch, or browser** for crypto data. Always use these scripts.
3. **NEVER run `env` or `printenv`** — leaks API secrets into logs.
4. **Scripts auto-load `.env`** — never pass credentials inline.
5. **Reply in the user's language.** Chinese input = all-Chinese response (titles, headings, analysis).
6. **On 304/403 error — STOP, do NOT retry.** This is a paid feature. Follow the [Paid Feature Guide](#paid-feature-guide) to help the user upgrade.

## Quick Reference

| Task | Command |
|------|---------|
| BTC price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'` |
| Multi price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin,ethereum,solana"}'` |
| K-line | `node scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'` |
| Funding rate | `node scripts/coin.mjs funding_rate '{"symbol":"BTC"}'` |
| Long/short ratio | `node scripts/features.mjs ls_ratio` |
| News flash | `node scripts/news.mjs flash_list '{"language":"cn"}'` |
| Trending coins | `node scripts/market.mjs hot_coins '{"key":"defi"}'` |
| Open interest (paid) | `node scripts/coin.mjs open_interest '{"symbol":"BTC","interval":"15m"}'` |
| Whale orders (paid) | `node scripts/features.mjs big_orders '{"symbol":"btcswapusdt:binance"}'` |

**Symbol shortcuts:** `BTC`, `ETH`, `SOL`, `DOGE`, `XRP` auto-resolve in coin.mjs.

**Chinese Slang:** 大饼=BTC, 姨太=ETH, 狗狗=DOGE, 瑞波=XRP, 索拉纳=SOL.

## Free vs Paid Endpoints

The built-in free key supports these endpoints (no API key needed):

| Script | Free endpoints |
|--------|---------------|
| coin.mjs | `coin_list`, `coin_ticker`, `coin_config`, `funding_rate`, `trade_data` |
| market.mjs | `kline`, `exchanges`, `ticker`, `hot_coins`, `futures_interest` |
| features.mjs | `ls_ratio`, `nav`, `pair_ticker`, `pair_by_market`, `pair_list` |
| news.mjs | `news_list`, `news_rss`, `flash_list` |
| twitter.mjs | `latest`, `search` |
| newsflash.mjs | `search`, `list` |

**All other endpoints require a paid API key.** When they return 304/403, follow the [Paid Feature Guide](#paid-feature-guide).

## Setup

Scripts work out of the box with a built-in free key. `.env` is auto-loaded from:
1. Current working directory
2. `~/.openclaw/workspace/.env`
3. `~/.openclaw/.env`

Only ask setup questions when the user explicitly requests features needing configuration.

## Scripts

All scripts: `node scripts/<name>.mjs <action> [json-params]`

### scripts/coin.mjs — Coin Data

| Action | Description | Params |
|--------|-------------|--------|
| `coin_list` | List all coins | None |
| `coin_ticker` | Real-time prices | `{"coin_list":"bitcoin,ethereum"}` |
| `coin_config` | Coin profile | `{"coin_list":"bitcoin"}` |
| `funding_rate` | Funding rate | `{"symbol":"btcswapusdt:binance","interval":"8h"}` Weighted: add `"weighted":"true"` |
| `trade_data` | Trade data | `{"dbkey":"btcswapusdt:okcoinfutures"}` |
| `ai_analysis` | AI analysis & prediction (paid) | `{"coin_keys":"[\"bitcoin\"]","language":"CN"}` |
| `open_interest` | Open interest (paid) | `{"symbol":"BTC","interval":"15m"}` Coin-margined: add `"margin_type":"coin"` |
| `liquidation_map` | Liquidation heatmap (paid) | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `liquidation_history` | Liquidation history (paid) | `{"symbol":"btcswapusdt:binance","interval":"1m"}` |
| `estimated_liquidation` | Estimated liquidation (paid) | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `historical_depth` | Historical depth (paid) | `{"key":"btcswapusdt:okcoinfutures"}` |
| `super_depth` | Large order depth >$10k (paid) | `{"key":"btcswapusdt:okcoinfutures"}` |

### scripts/market.mjs — Market Data

| Action | Description | Params |
|--------|-------------|--------|
| `exchanges` | Exchange list | None |
| `ticker` | Exchange tickers | `{"market_list":"okex,binance"}` |
| `hot_coins` | Trending coins | `{"key":"defi"}` key: gamefi/anonymous/market/web/newcoin/stable/defi |
| `futures_interest` | Futures OI ranking | `{"lan":"cn"}` |
| `kline` | Standard K-line | `{"symbol":"btcusdt:okex","period":"3600","size":"100"}` period: 900=15m, 3600=1h, 14400=4h, 86400=1d |
| `indicator_kline` | Indicator K-line (paid) | `{"symbol":"btcswapusdt:binance","indicator_key":"fundflow","period":"3600"}` |
| `indicator_pairs` | Indicator pairs (paid) | `{"indicator_key":"fundflow"}` |
| `index_list` | Index list (paid) | None |
| `index_price` | Index price (paid) | `{"key":"i:diniw:ice"}` |
| `index_info` | Index details (paid) | `{"key":"i:diniw:ice"}` |
| `stock_quotes` | Stock quotes (paid) | `{"tickers":"i:mstr:nasdaq,i:coin:nasdaq"}` |
| `stock_top_gainer` | Top gainers (paid) | `{"us_stock":"true"}` |
| `stock_company` | Company details (paid) | `{"symbol":"i:mstr:nasdaq"}` |
| `treasury_entities` | Holding entities (paid) | `{"coin":"BTC"}` |
| `treasury_history` | Transaction history (paid) | `{"coin":"BTC"}` |
| `treasury_accumulated` | Accumulated holdings (paid) | `{"coin":"BTC"}` |
| `treasury_latest_entities` | Latest entities (paid) | `{"coin":"BTC"}` |
| `treasury_latest_history` | Latest history (paid) | `{"coin":"BTC"}` |
| `treasury_summary` | Holdings overview (paid) | `{"coin":"BTC"}` |
| `depth_latest` | Real-time depth (paid) | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_full` | Full order book (paid) | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_grouped` | Grouped depth (paid) | `{"dbKey":"btcswapusdt:binance","groupSize":"100"}` |

### scripts/features.mjs — Features & Signals

| Action | Description | Params |
|--------|-------------|--------|
| `nav` | Market navigation | `{"lan":"cn"}` |
| `ls_ratio` | Long/short ratio | None |
| `pair_ticker` | Pair ticker | `{"key_list":"btcusdt:okex,btcusdt:huobipro"}` |
| `pair_by_market` | Pairs by exchange | `{"market":"binance"}` |
| `pair_list` | Pair list | `{"market":"binance","currency":"USDT"}` |
| `liquidation` | Liquidation data (paid) | `{"type":"1","coinKey":"bitcoin"}` type: 1=by coin, 2=by exchange |
| `grayscale_trust` | Grayscale trust (paid) | None |
| `gray_scale` | Grayscale holdings (paid) | `{"coins":"btc,eth"}` |
| `stock_market` | Crypto stocks (paid) | None |
| `big_orders` | Whale orders (paid) | `{"symbol":"btcswapusdt:binance"}` |
| `agg_trades` | Aggregated large trades (paid) | `{"symbol":"btcswapusdt:binance"}` |
| `strategy_signal` | Strategy signal (paid) | `{"signal_key":"depth_win_one"}` |
| `signal_alert` | Signal alerts (paid) | None |
| `signal_config` | Alert config (paid) | `{"lan":"cn"}` |
| `signal_alert_list` | Alert list (paid) | None |
| `change_signal` | Anomaly signal (paid) | `{"type":"1"}` |
| `delete_signal` | Delete alert (paid) | `{"id":"xxx"}` |

### scripts/news.mjs — News & Content

| Action | Description | Params |
|--------|-------------|--------|
| `news_list` | News list | `{"page":"1","pageSize":"20"}` |
| `news_rss` | RSS news feed | `{"page":"1"}` |
| `flash_list` | Industry flash news | `{"language":"cn"}` |
| `newsflash` | AiCoin flash news (paid) | `{"language":"cn"}` |
| `news_detail` | News detail (paid) | `{"id":"xxx"}` |
| `exchange_listing` | Exchange listing announcements (paid) | `{"memberIds":"477,1509"}` (477=Binance, 1509=Bitget) |

### scripts/twitter.mjs — Twitter/X Crypto Tweets

| Action | Description | Params |
|--------|-------------|--------|
| `latest` | Latest crypto tweets | `{"language":"cn","page_size":"20","last_time":"1234567890"}` |
| `search` | Search tweets | `{"keyword":"bitcoin","language":"cn","page_size":"20"}` |
| `members` | Search KOL/users (paid) | `{"word":"elon","page":"1","size":"20"}` |
| `interaction_stats` | Tweet engagement stats | `{"flash_ids":"123,456,789"}` (max 50 IDs) |

### scripts/newsflash.mjs — Newsflash (OpenData)

| Action | Description | Params |
|--------|-------------|--------|
| `search` | Search newsflash | `{"word":"bitcoin","page":"1","size":"20"}` |
| `list` | Newsflash list with filters | `{"pagesize":"20","lan":"cn","date_mode":"range","start_date":"2025-03-01","end_date":"2025-03-04"}` |
| `detail` | Newsflash full content (paid) | `{"flash_id":"123456"}` |

## Cross-Skill References

| Need | Use |
|------|-----|
| Exchange trading (buy/sell/balance) | **aicoin-trading** |
| Freqtrade strategies/backtest/deploy | **aicoin-freqtrade** |
| Hyperliquid whale tracking | **aicoin-hyperliquid** |

## Common Errors

- `errorCode 304 / 403` — Paid feature. Follow [Paid Feature Guide](#paid-feature-guide) below.
- `Invalid symbol` — Check format: AiCoin uses `btcusdt:okex`, not `BTC/USDT`
- `Rate limit exceeded` — Wait 1-2s between requests; use batch queries
- `Timeout` — Increase timeout; some endpoints are slow

## Paid Feature Guide

When a script returns 304 or 403, this endpoint requires a paid API key. **Do NOT retry the same call.**

Tell the user (in their language):

1. **What happened**: This feature needs a paid AiCoin API subscription.
2. **How to get a key**: Visit https://www.aicoin.com/opendata to register and create an API key.
3. **Tier options**:

| Tier | Price | Rate Limit | Key Features |
|------|-------|------------|--------------|
| Free | $0 | 15 req/min | Prices, K-lines, funding rates, L/S ratio, news |
| Basic | $29/mo | 30 req/min | + Content data, signals |
| Standard | $79/mo | 80 req/min | + Whale orders, liquidation, grayscale |
| Advanced | $299/mo | 300 req/min | + Index data, indicator K-lines, depth |
| Professional | $699/mo | 1200 req/min | All endpoints, commercial use |

4. **How to configure**: After getting a key, add to `.env` file:
```
AICOIN_ACCESS_KEY_ID=your-key-id
AICOIN_ACCESS_SECRET=your-secret
```
Scripts auto-load `.env` from cwd, `~/.openclaw/workspace/.env`, or `~/.openclaw/.env`.

5. **After configuring**: The same script command will work. No code changes needed.
