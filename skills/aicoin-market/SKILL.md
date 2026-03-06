---
name: aicoin-market
description: "This skill should be used when the user asks about crypto prices, market data, K-line charts, funding rates, open interest, long/short ratios, whale orders, liquidation data, crypto news, newsflash, Twitter crypto tweets, trending coins, stock quotes, treasury holdings, or any crypto market query. Use when user says: 'BTC price', 'check price', 'show K-line', 'funding rate', 'open interest', 'whale orders', 'long/short ratio', 'crypto news', 'newsflash', 'trending coins', '查行情', '看价格', '大饼多少钱', 'K线', '资金费率', '多空比', '鲸鱼单', '新闻快讯', '热门币', 'liquidation map'. Covers 200+ exchanges with real-time data. MUST run node scripts to fetch real data. NEVER generate fake prices or hallucinate market data. For exchange trading (buy/sell/balance), use aicoin-trading instead. For Freqtrade strategies/backtest, use aicoin-freqtrade. For Hyperliquid whale analytics, use aicoin-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/coinos-skills", "license": "MIT" } }
---

# AiCoin Market

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

| Task | Command | Min Tier |
|------|---------|----------|
| BTC price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'` | Free |
| K-line | `node scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'` | Free |
| Funding rate | `node scripts/coin.mjs funding_rate '{"symbol":"BTC"}'` | Basic |
| Long/short ratio | `node scripts/features.mjs ls_ratio` | Basic |
| Whale orders | `node scripts/features.mjs big_orders '{"symbol":"btcswapusdt:binance"}'` | Standard |
| News flash | `node scripts/news.mjs flash_list '{"language":"cn"}'` | Basic |
| Trending coins | `node scripts/market.mjs hot_coins '{"key":"defi"}'` | Free |
| Open interest | `node scripts/coin.mjs open_interest '{"symbol":"BTC","interval":"15m"}'` | Professional |
| Liquidation map | `node scripts/coin.mjs liquidation_map '{"dbkey":"btcswapusdt:binance","cycle":"24h"}'` | Advanced |

**Symbol shortcuts:** `BTC`, `ETH`, `SOL`, `DOGE`, `XRP` auto-resolve in coin.mjs.

**Chinese Slang:** 大饼=BTC, 姨太=ETH, 狗狗=DOGE, 瑞波=XRP, 索拉纳=SOL.

## Free vs Paid Endpoints

**Free (built-in key, no config needed):** `coin_ticker`, `kline`, `hot_coins`, `exchanges`, `pair_ticker`, `news_rss` — only 6 endpoints.

**Basic ($29/mo) adds:** `coin_list`, `coin_config`, `funding_rate`, `trade_data`, `ticker`, `futures_interest`, `ls_ratio`, `nav`, `pair_by_market`, `pair_list`, `news_list`, `flash_list`, `twitter/latest`, `twitter/search`, `newsflash/search`, `newsflash/list`

**Standard ($79/mo) adds:** `big_orders`, `agg_trades`, `grayscale_trust`, `gray_scale`, `signal_alert`, `signal_config`, `strategy_signal`, `change_signal`, `depth_latest`, `newsflash`, `news_detail`, `twitter/members`, `twitter/interaction_stats`, `newsflash/detail`

**Advanced ($299/mo) adds:** `liquidation_map`, `liquidation_history`, `liquidation`, `indicator_kline`, `indicator_pairs`, `index_list`, `index_price`, `index_info`, `depth_full`, `depth_grouped`

**Professional ($699/mo) adds:** `ai_analysis`, `open_interest`, `estimated_liquidation`, `historical_depth`, `super_depth`, `funding_rate`(weighted), `stock_quotes`, `stock_top_gainer`, `stock_company`, `treasury_*`, `stock_market`, `signal_alert_list`, `exchange_listing`

Full tier table: `docs/api-tiers.md`

## Setup

Scripts work out of the box with a built-in free key (6 endpoints). For more endpoints, add your API key to `.env`:

```
AICOIN_ACCESS_KEY_ID=your-key
AICOIN_ACCESS_SECRET=your-secret
```

`.env` is auto-loaded from: cwd → `~/.openclaw/workspace/.env` → `~/.openclaw/.env`

## Scripts

All scripts: `node scripts/<name>.mjs <action> [json-params]`

### scripts/coin.mjs — Coin Data

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `coin_ticker` | Real-time prices | Free | `{"coin_list":"bitcoin,ethereum"}` |
| `coin_list` | List all coins | Basic | None |
| `coin_config` | Coin profile | Basic | `{"coin_list":"bitcoin"}` |
| `funding_rate` | Funding rate | Basic | `{"symbol":"BTC","interval":"8h"}` Weighted: add `"weighted":"true"` (Pro) |
| `trade_data` | Trade data | Basic | `{"symbol":"btcswapusdt:okcoinfutures"}` |
| `ai_analysis` | AI analysis & prediction | Pro | `{"coin_keys":"[\"bitcoin\"]","language":"CN"}` |
| `open_interest` | Open interest | Pro | `{"symbol":"BTC","interval":"15m"}` Coin-margined: add `"margin_type":"coin"` |
| `liquidation_map` | Liquidation heatmap | Adv | `{"symbol":"btcswapusdt:binance","cycle":"24h"}` |
| `liquidation_history` | Liquidation history | Adv | `{"symbol":"btcswapusdt:binance","interval":"1m"}` |
| `estimated_liquidation` | Estimated liquidation | Pro | `{"symbol":"btcswapusdt:binance","cycle":"24h"}` |
| `historical_depth` | Historical depth | Pro | `{"symbol":"btcswapusdt:okcoinfutures"}` |
| `super_depth` | Large order depth >$10k | Pro | `{"symbol":"btcswapusdt:okcoinfutures"}` |

### scripts/market.mjs — Market Data

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `kline` | Standard K-line | Free | `{"symbol":"btcusdt:okex","period":"3600","size":"100"}` period: 900/3600/14400/86400 |
| `hot_coins` | Trending coins | Free | `{"key":"defi"}` key: gamefi/anonymous/market/web/newcoin/stable/defi |
| `exchanges` | Exchange list | Free | None |
| `ticker` | Exchange tickers | Basic | `{"market_list":"okex,binance"}` |
| `futures_interest` | Futures OI ranking | Basic | `{"language":"cn"}` |
| `depth_latest` | Real-time depth | Std | `{"symbol":"btcswapusdt:binance"}` |
| `indicator_kline` | Indicator K-line | Adv | `{"symbol":"btcswapusdt:binance","indicator_key":"fundflow","period":"3600"}` |
| `indicator_pairs` | Indicator pairs | Adv | `{"indicator_key":"fundflow"}` |
| `index_list` | Index list | Adv | None |
| `index_price` | Index price | Adv | `{"key":"i:diniw:ice"}` |
| `index_info` | Index details | Adv | `{"key":"i:diniw:ice"}` |
| `depth_full` | Full order book | Adv | `{"symbol":"btcswapusdt:binance"}` |
| `depth_grouped` | Grouped depth | Adv | `{"symbol":"btcswapusdt:binance","groupSize":"100"}` |
| `stock_quotes` | Stock quotes | Pro | `{"tickers":"i:mstr:nasdaq"}` |
| `stock_top_gainer` | Top gainers | Pro | `{"us_stock":"true"}` |
| `stock_company` | Company details | Pro | `{"symbol":"i:mstr:nasdaq"}` |
| `treasury_entities` | Holding entities | Pro | `{"coin":"BTC"}` |
| `treasury_history` | Transaction history | Pro | `{"coin":"BTC"}` |
| `treasury_accumulated` | Accumulated holdings | Pro | `{"coin":"BTC"}` |
| `treasury_latest_entities` | Latest entities | Pro | `{"coin":"BTC"}` |
| `treasury_latest_history` | Latest history | Pro | `{"coin":"BTC"}` |
| `treasury_summary` | Holdings overview | Pro | `{"coin":"BTC"}` |

### scripts/features.mjs — Features & Signals

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `pair_ticker` | Pair ticker | Free | `{"key_list":"btcusdt:okex,btcusdt:huobipro"}` |
| `ls_ratio` | Long/short ratio | Basic | None |
| `nav` | Market navigation | Basic | `{"language":"cn"}` |
| `pair_by_market` | Pairs by exchange | Basic | `{"market":"binance"}` |
| `pair_list` | Pair list | Basic | `{"market":"binance","currency":"USDT"}` |
| `grayscale_trust` | Grayscale trust | Std | None |
| `gray_scale` | Grayscale holdings | Std | `{"coins":"btc,eth"}` |
| `signal_alert` | Signal alerts | Std | None |
| `signal_config` | Alert config | Std | `{"language":"cn"}` |
| `strategy_signal` | Strategy signal | Std | `{"signal_key":"depth_win_one"}` |
| `change_signal` | Anomaly signal | Std | `{"type":"1"}` |
| `big_orders` | Whale orders | Std | `{"symbol":"btcswapusdt:binance"}` |
| `agg_trades` | Aggregated large trades | Std | `{"symbol":"btcswapusdt:binance"}` |
| `liquidation` | Liquidation data | Adv | `{"type":"1","coinKey":"bitcoin"}` |
| `signal_alert_list` | Alert list | Pro | None |
| `stock_market` | Crypto stocks | Pro | None |
| `delete_signal` | Delete alert | Pro | `{"id":"xxx"}` |

### scripts/news.mjs — News & Content

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `news_rss` | RSS news feed | Free | `{"page":"1"}` |
| `news_list` | News list | Basic | `{"page":"1","page_size":"20"}` |
| `flash_list` | Industry flash news | Basic | `{"language":"cn"}` |
| `newsflash` | AiCoin flash news | Std | `{"language":"cn"}` |
| `news_detail` | News detail | Std | `{"id":"xxx"}` |
| `exchange_listing` | Exchange listing announcements | Pro | `{"memberIds":"477,1509"}` |

### scripts/twitter.mjs — Twitter/X Crypto Tweets

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `latest` | Latest crypto tweets | Basic | `{"language":"cn","page_size":"20"}` |
| `search` | Search tweets | Basic | `{"keyword":"bitcoin","language":"cn","page_size":"20"}` |
| `members` | Search KOL/users | Std | `{"keyword":"elon","page":"1","page_size":"20"}` |
| `interaction_stats` | Tweet engagement stats | Std | `{"flash_ids":"123,456,789"}` |

### scripts/newsflash.mjs — Newsflash (OpenData)

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `search` | Search newsflash | Basic | `{"keyword":"bitcoin","page":"1","page_size":"20"}` |
| `list` | Newsflash list with filters | Basic | `{"page_size":"20","language":"cn"}` |
| `detail` | Newsflash full content | Std | `{"flash_id":"123456"}` |

### scripts/airdrop.mjs — Airdrop (OpenData)

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `list` | Airdrop projects list | Basic | `{"page":"1","page_size":"20","exchange":"binance"}` |
| `exchanges` | Available exchanges and activity types | Basic | `{"lan":"cn"}` |
| `banner` | Hot airdrop banners | Basic | `{"limit":"5"}` |
| `finished` | Completed airdrop projects | Std | `{"page":"1","page_size":"20"}` |
| `calendar` | Airdrop calendar (year+month required) | Std | `{"year":"2026","month":"3"}` |
| `detail` | Airdrop detail (hodler/xlaunch) | Std | `{"detail_type":"hodler","token":"SIGN"}` |
| `cryptorank_list` | CryptoRank airdrop list | Pro | `{"page":"1","page_size":"20"}` |
| `cryptorank_detail` | CryptoRank airdrop detail | Pro | `{"token":"69a6e6b5a905aa5c73e2992e"}` |

## Cross-Skill References

| Need | Use |
|------|-----|
| Exchange trading (buy/sell/balance) | **aicoin-trading** |
| Freqtrade strategies/backtest/deploy | **aicoin-freqtrade** |
| Hyperliquid whale tracking | **aicoin-hyperliquid** |

## Common Errors

- `errorCode 304 / HTTP 403` — Paid feature. Follow [Paid Feature Guide](#paid-feature-guide) below.
- `Invalid symbol` — Check format: AiCoin uses `btcusdt:okex`, not `BTC/USDT`
- `Rate limit exceeded` — Wait 1-2s between requests; use batch queries

## Paid Feature Guide

When a script returns 304 or 403, this endpoint requires a higher API tier. **Do NOT retry the same call.**

Tell the user (in their language):

1. **What happened**: This feature needs a paid AiCoin API subscription.
2. **How to get a key**: Visit https://www.aicoin.com/opendata to register and create an API key.
3. **Tier options**:

| Tier | Price | Highlights |
|------|-------|------------|
| Free | $0 | Prices, K-lines, trending coins (6 endpoints) |
| Basic | $29/mo | + Funding rate, L/S ratio, news, twitter (24 endpoints) |
| Standard | $79/mo | + Whale orders, signals, grayscale (38 endpoints) |
| Advanced | $299/mo | + Liquidation map, indicator K-lines, index, depth (49 endpoints) |
| Professional | $699/mo | All 63 endpoints: AI analysis, OI, stocks, treasury |

4. **How to configure**: After getting a key, add to `.env` file:
```
AICOIN_ACCESS_KEY_ID=your-key-id
AICOIN_ACCESS_SECRET=your-secret
```
Scripts auto-load `.env` from cwd, `~/.openclaw/workspace/.env`, or `~/.openclaw/.env`.

5. **After configuring**: The same script command will work. No code changes needed.
