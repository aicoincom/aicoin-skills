---
name: coinos-market
description: "This skill should be used when the user asks about crypto prices, market data, K-line charts, funding rates, open interest, long/short ratios, whale orders, liquidation data, crypto news, newsflash, Twitter crypto tweets, trending coins, stock quotes, treasury holdings, or any crypto market query. Use when user says: 'BTC price', 'check price', 'show K-line', 'funding rate', 'open interest', 'whale orders', 'long/short ratio', 'crypto news', 'newsflash', 'trending coins', '查行情', '看价格', '大饼多少钱', 'K线', '资金费率', '多空比', '鲸鱼单', '新闻快讯', '热门币', 'liquidation map'. Covers 200+ exchanges with real-time data. MUST run node scripts to fetch real data. NEVER generate fake prices or hallucinate market data. For exchange trading (buy/sell/balance), use coinos-trading instead. For Freqtrade strategies/backtest, use coinos-freqtrade. For Hyperliquid whale analytics, use coinos-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/aicoin-skills", "license": "MIT" } }
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

## Quick Reference

| Task | Command |
|------|---------|
| BTC price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'` |
| Multi price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin,ethereum,solana"}'` |
| K-line | `node scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'` |
| Funding rate | `node scripts/coin.mjs funding_rate '{"symbol":"BTC"}'` |
| Open interest | `node scripts/coin.mjs open_interest '{"symbol":"BTC","interval":"15m"}'` |
| Long/short ratio | `node scripts/features.mjs ls_ratio` |
| Whale orders | `node scripts/features.mjs big_orders '{"symbol":"btcswapusdt:binance"}'` |
| News flash | `node scripts/news.mjs newsflash '{"language":"cn"}'` |
| Trending coins | `node scripts/market.mjs hot_coins '{"key":"defi"}'` |

**Symbol shortcuts:** `BTC`, `ETH`, `SOL`, `DOGE`, `XRP` auto-resolve in coin.mjs.

**Chinese Slang:** 大饼=BTC, 姨太=ETH, 狗狗=DOGE, 瑞波=XRP, 索拉纳=SOL.

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
| `ai_analysis` | AI analysis & prediction | `{"coin_keys":"[\"bitcoin\"]","language":"CN"}` |
| `funding_rate` | Funding rate | `{"symbol":"btcswapusdt:binance","interval":"8h"}` Weighted: add `"weighted":"true"` |
| `liquidation_map` | Liquidation heatmap | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `liquidation_history` | Liquidation history | `{"symbol":"btcswapusdt:binance","interval":"1m"}` |
| `estimated_liquidation` | Estimated liquidation | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `open_interest` | Open interest | `{"symbol":"BTC","interval":"15m"}` Coin-margined: add `"margin_type":"coin"` |
| `historical_depth` | Historical depth | `{"key":"btcswapusdt:okcoinfutures"}` |
| `super_depth` | Large order depth (>$10k) | `{"key":"btcswapusdt:okcoinfutures"}` |
| `trade_data` | Trade data | `{"dbkey":"btcswapusdt:okcoinfutures"}` |

### scripts/market.mjs — Market Data

| Action | Description | Params |
|--------|-------------|--------|
| `exchanges` | Exchange list | None |
| `ticker` | Exchange tickers | `{"market_list":"okex,binance"}` |
| `hot_coins` | Trending coins | `{"key":"defi"}` key: gamefi/anonymous/market/web/newcoin/stable/defi |
| `futures_interest` | Futures OI ranking | `{"lan":"cn"}` |
| `kline` | Standard K-line | `{"symbol":"btcusdt:okex","period":"3600","size":"100"}` period: 900=15m, 3600=1h, 14400=4h, 86400=1d |
| `indicator_kline` | Indicator K-line | `{"symbol":"btcswapusdt:binance","indicator_key":"fundflow","period":"3600"}` |
| `indicator_pairs` | Indicator pairs | `{"indicator_key":"fundflow"}` |
| `index_list` | Index list | None |
| `index_price` | Index price | `{"key":"i:diniw:ice"}` |
| `index_info` | Index details | `{"key":"i:diniw:ice"}` |
| `stock_quotes` | Stock quotes | `{"tickers":"i:mstr:nasdaq,i:coin:nasdaq"}` |
| `stock_top_gainer` | Top gainers | `{"us_stock":"true"}` |
| `stock_company` | Company details | `{"symbol":"i:mstr:nasdaq"}` |
| `treasury_entities` | Holding entities | `{"coin":"BTC"}` |
| `treasury_history` | Transaction history | `{"coin":"BTC"}` |
| `treasury_accumulated` | Accumulated holdings | `{"coin":"BTC"}` |
| `treasury_latest_entities` | Latest entities | `{"coin":"BTC"}` |
| `treasury_latest_history` | Latest history | `{"coin":"BTC"}` |
| `treasury_summary` | Holdings overview | `{"coin":"BTC"}` |
| `depth_latest` | Real-time depth | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_full` | Full order book | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_grouped` | Grouped depth | `{"dbKey":"btcswapusdt:binance","groupSize":"100"}` |

### scripts/features.mjs — Features & Signals

| Action | Description | Params |
|--------|-------------|--------|
| `nav` | Market navigation | `{"lan":"cn"}` |
| `ls_ratio` | Long/short ratio | None |
| `liquidation` | Liquidation data | `{"type":"1","coinKey":"bitcoin"}` type: 1=by coin, 2=by exchange |
| `grayscale_trust` | Grayscale trust | None |
| `gray_scale` | Grayscale holdings | `{"coins":"btc,eth"}` |
| `stock_market` | Crypto stocks | None |
| `big_orders` | Whale orders | `{"symbol":"btcswapusdt:binance"}` |
| `agg_trades` | Aggregated large trades | `{"symbol":"btcswapusdt:binance"}` |
| `pair_ticker` | Pair ticker | `{"key_list":"btcusdt:okex,btcusdt:huobipro"}` |
| `pair_by_market` | Pairs by exchange | `{"market":"binance"}` |
| `pair_list` | Pair list | `{"market":"binance","currency":"USDT"}` |
| `strategy_signal` | Strategy signal | `{"signal_key":"depth_win_one"}` |
| `signal_alert` | Signal alerts | None |
| `signal_config` | Alert config | `{"lan":"cn"}` |
| `signal_alert_list` | Alert list | None |
| `change_signal` | Anomaly signal | `{"type":"1"}` |
| `delete_signal` | Delete alert | `{"id":"xxx"}` |

### scripts/news.mjs — News & Content

| Action | Description | Params |
|--------|-------------|--------|
| `news_list` | News list | `{"page":"1","pageSize":"20"}` |
| `news_detail` | News detail | `{"id":"xxx"}` |
| `news_rss` | RSS news | `{"page":"1"}` |
| `newsflash` | AiCoin flash news | `{"language":"cn"}` |
| `flash_list` | Industry flash news | `{"language":"cn"}` |
| `exchange_listing` | Exchange listing announcements | `{"memberIds":"477,1509"}` (477=Binance, 1509=Bitget) |

### scripts/twitter.mjs — Twitter/X Crypto Tweets

| Action | Description | Params |
|--------|-------------|--------|
| `latest` | Latest crypto tweets | `{"language":"cn","page_size":"20","last_time":"1234567890"}` |
| `search` | Search tweets | `{"keyword":"bitcoin","language":"cn","page_size":"20"}` |
| `members` | Search KOL/users | `{"word":"elon","page":"1","size":"20"}` |
| `interaction_stats` | Tweet engagement stats | `{"flash_ids":"123,456,789"}` (max 50 IDs) |

### scripts/newsflash.mjs — Newsflash (OpenData)

| Action | Description | Params |
|--------|-------------|--------|
| `search` | Search newsflash | `{"word":"bitcoin","page":"1","size":"20"}` |
| `list` | Newsflash list with filters | `{"pagesize":"20","lan":"cn","date_mode":"range","start_date":"2025-03-01","end_date":"2025-03-04"}` |
| `detail` | Newsflash full content | `{"flash_id":"123456"}` |

## Cross-Skill References

| Need | Use |
|------|-----|
| Exchange trading (buy/sell/balance) | **coinos-trading** |
| Freqtrade strategies/backtest/deploy | **coinos-freqtrade** |
| Hyperliquid whale tracking | **coinos-hyperliquid** |

## Common Errors

- `Invalid symbol` — Check format: AiCoin uses `btcusdt:okex`, not `BTC/USDT`
- `Rate limit exceeded` — Wait 1-2s between requests; use batch queries
- `Timeout` — Increase timeout; some endpoints are slow
- `Script not found` — Ensure you're in the coinos-market skill directory

## Environment Variables

Scripts auto-load `.env`. Optional custom AiCoin key:
```
AICOIN_ACCESS_KEY_ID=your-api-key
AICOIN_ACCESS_SECRET=your-api-secret
PROXY_URL=socks5://127.0.0.1:7890  # optional
```
