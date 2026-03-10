---
name: aicoin-market
description: "This skill should be used when the user asks about crypto prices, market data, K-line charts, funding rates, open interest, long/short ratios, whale orders, liquidation data, crypto news, newsflash, Twitter crypto tweets, trending coins, stock quotes, treasury holdings, or any crypto market query. Also use when user asks about configuring or checking AiCoin API key. Use when user says: 'BTC price', 'check price', 'show K-line', 'funding rate', 'open interest', 'whale orders', 'long/short ratio', 'crypto news', 'newsflash', 'trending coins', '查行情', '看价格', '大饼多少钱', 'K线', '资金费率', '多空比', '鲸鱼单', '新闻快讯', '热门币', 'liquidation map', '配置AiCoin key', 'AiCoin API key', 'AiCoin key安全吗'. Covers 200+ exchanges with real-time data. MUST run node scripts to fetch real data. NEVER generate fake prices or hallucinate market data. IMPORTANT — AiCoin API Key: When user asks about AiCoin API key (配置/检查/安全/能不能交易), run `node scripts/coin.mjs api_key_info` FIRST, show the security_notice to user. For exchange trading (buy/sell/balance), use aicoin-trading instead. For Freqtrade strategies/backtest, use aicoin-freqtrade. For Hyperliquid whale analytics, use aicoin-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/coinos-skills", "license": "MIT" } }
---

> **⚠️ 运行脚本: 所有 `node scripts/...` 命令必须以本 SKILL.md 所在目录为 workdir。**

# AiCoin Market

Crypto market data toolkit powered by [AiCoin Open API](https://www.aicoin.com/opendata). Prices, K-lines, news, signals, whale orders, and more from 200+ exchanges.

**Version:** 1.0.0

## Critical Rules

1. **NEVER fabricate data.** Always run scripts. If data is empty or errors occur, say so directly — do NOT invent explanations.
2. **NEVER use curl, web_fetch, or browser** for crypto data. Always use these scripts.
3. **NEVER run `env` or `printenv`** — leaks API secrets into logs.
4. **Scripts auto-load `.env`** — never pass credentials inline.
5. **Reply in the user's language.** Chinese input = all-Chinese response (titles, headings, analysis).
6. **On 304/403 error — STOP, do NOT retry.** This is a paid feature. Follow the [Paid Feature Guide](#paid-feature-guide) to help the user upgrade.

## Quick Reference

| Task | Command | Min Tier |
|------|---------|----------|
| **API Key Info** | `node scripts/coin.mjs api_key_info` — **When user asks about AiCoin API key (配置/安全/能不能下单), ALWAYS run this first.** | 免费版 |
| BTC price | `node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'` | 免费版 |
| K-line | `node scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'` | 免费版 |
| Funding rate | `node scripts/coin.mjs funding_rate '{"symbol":"BTC"}'` | 基础版 |
| Long/short ratio | `node scripts/features.mjs ls_ratio` | 基础版 |
| Whale orders | `node scripts/features.mjs big_orders '{"symbol":"btcswapusdt:binance"}'` | 标准版 |
| News flash | `node scripts/news.mjs flash_list '{"language":"cn"}'` | 基础版 |
| Trending coins | `node scripts/market.mjs hot_coins '{"key":"defi"}'` | 免费版 |
| Open interest | `node scripts/coin.mjs open_interest '{"symbol":"BTC","interval":"15m"}'` | 专业版 |
| Liquidation map | `node scripts/coin.mjs liquidation_map '{"dbkey":"btcswapusdt:binance","cycle":"24h"}'` | 高级版 |

**Symbol shortcuts:** `BTC`, `ETH`, `SOL`, `DOGE`, `XRP` auto-resolve in coin.mjs.

**Chinese Slang:** 大饼=BTC, 姨太=ETH, 狗狗=DOGE, 瑞波=XRP, 索拉纳=SOL.

## Free vs Paid Endpoints

**Free (built-in key, no config needed):** `coin_ticker`, `kline`, `hot_coins`, `exchanges`, `pair_ticker`, `news_rss` — only 6 endpoints.

**基础版 ($29/mo) adds:** `coin_list`, `coin_config`, `funding_rate`, `trade_data`, `ticker`, `futures_interest`, `ls_ratio`, `nav`, `pair_by_market`, `pair_list`, `news_list`, `flash_list`, `twitter/latest`, `twitter/search`, `newsflash/search`, `newsflash/list`

**标准版 ($79/mo) adds:** `big_orders`, `agg_trades`, `grayscale_trust`, `gray_scale`, `signal_alert`, `signal_config`, `strategy_signal`, `change_signal`, `depth_latest`, `newsflash`, `news_detail`, `twitter/members`, `twitter/interaction_stats`, `newsflash/detail`

**高级版 ($299/mo) adds:** `liquidation_map`, `liquidation_history`, `liquidation`, `indicator_kline`, `indicator_pairs`, `index_list`, `index_price`, `index_info`, `depth_full`, `depth_grouped`

**专业版 ($699/mo) adds:** `ai_analysis`, `open_interest`, `estimated_liquidation`, `historical_depth`, `super_depth`, `funding_rate`(weighted), `stock_quotes`, `stock_top_gainer`, `stock_company`, `treasury_*`, `stock_market`, `signal_alert_list`, `exchange_listing`

Full tier table: `docs/api-tiers.md`

## Setup

Scripts work out of the box with a built-in free key (6 endpoints). For more endpoints, add your API key to `.env`:

```
AICOIN_ACCESS_KEY_ID=your-key
AICOIN_ACCESS_SECRET=your-secret
```

**安全说明：** AiCoin API Key 仅用于获取市场数据（行情、K线、新闻等），无法进行任何交易操作，也无法读取你在交易所的信息。如需交易功能，需单独到交易所申请交易 API Key（见 aicoin-trading skill）。所有密钥仅保存在本地设备 `.env` 文件中，不会上传到任何服务器。

`.env` is auto-loaded from: cwd → `~/.openclaw/workspace/.env` → `~/.openclaw/.env`

## Scripts

All scripts: `node scripts/<name>.mjs <action> [json-params]`

### scripts/coin.mjs — Coin Data

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `api_key_info` | **AiCoin API Key status + security notice. Run when user asks about key config/safety.** | 免费版 | None |
| `coin_ticker` | Real-time prices | 免费版 | `{"coin_list":"bitcoin,ethereum"}` |
| `coin_list` | List all coins | 基础版 | None |
| `coin_config` | Coin profile | 基础版 | `{"coin_list":"bitcoin"}` |
| `funding_rate` | Funding rate (BTC only, aggregated) | 基础版 | `{"symbol":"BTC","interval":"8h"}` Weighted: add `"weighted":"true"` (专业版). For per-exchange real-time rates, use **aicoin-trading**: `node scripts/exchange.mjs funding_rate '{"exchange":"binance","symbol":"BTC/USDT:USDT"}'` |
| `trade_data` | Trade data | 基础版 | `{"symbol":"btcswapusdt:okcoinfutures"}` |
| `ai_analysis` | AI analysis & prediction | 专业版 | `{"coin_keys":"[\"bitcoin\"]","language":"CN"}` |
| `open_interest` | Open interest | 专业版 | `{"symbol":"BTC","interval":"15m"}` Coin-margined: add `"margin_type":"coin"` |
| `liquidation_map` | Liquidation heatmap | 高级版 | `{"symbol":"btcswapusdt:binance","cycle":"24h"}` |
| `liquidation_history` | Liquidation history | 高级版 | `{"symbol":"btcswapusdt:binance","interval":"1m"}` |
| `estimated_liquidation` | Estimated liquidation | 专业版 | `{"symbol":"btcswapusdt:binance","cycle":"24h"}` |
| `historical_depth` | Historical depth | 专业版 | `{"symbol":"btcswapusdt:okcoinfutures"}` |
| `super_depth` | Large order depth >$10k | 专业版 | `{"symbol":"btcswapusdt:okcoinfutures"}` |

### scripts/market.mjs — Market Data

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `kline` | Standard K-line | 免费版 | `{"symbol":"btcusdt:okex","period":"3600","size":"100"}` period: 900/3600/14400/86400 |
| `hot_coins` | Trending coins | 免费版 | `{"key":"defi"}` key: gamefi/anonymous/market/web/newcoin/stable/defi |
| `exchanges` | Exchange list | 免费版 | None |
| `ticker` | Exchange tickers | 基础版 | `{"market_list":"okex,binance"}` |
| `futures_interest` | Futures OI ranking | 基础版 | `{"language":"cn"}` |
| `depth_latest` | Real-time depth | 标准版 | `{"symbol":"btcswapusdt:binance"}` |
| `indicator_kline` | Indicator K-line | 高级版 | `{"symbol":"btcswapusdt:binance","indicator_key":"fundflow","period":"3600"}` |
| `indicator_pairs` | Indicator pairs | 高级版 | `{"indicator_key":"fundflow"}` |
| `index_list` | Index list | 高级版 | None |
| `index_price` | Index price | 高级版 | `{"key":"i:diniw:ice"}` |
| `index_info` | Index details | 高级版 | `{"key":"i:diniw:ice"}` |
| `depth_full` | Full order book | 高级版 | `{"symbol":"btcswapusdt:binance"}` |
| `depth_grouped` | Grouped depth | 高级版 | `{"symbol":"btcswapusdt:binance","groupSize":"100"}` |
| `stock_quotes` | Stock quotes | 专业版 | `{"tickers":"i:mstr:nasdaq"}` |
| `stock_top_gainer` | Top gainers | 专业版 | `{"us_stock":"true"}` |
| `stock_company` | Company details | 专业版 | `{"symbol":"i:mstr:nasdaq"}` |
| `treasury_entities` | Holding entities | 专业版 | `{"coin":"BTC"}` |
| `treasury_history` | Transaction history | 专业版 | `{"coin":"BTC"}` |
| `treasury_accumulated` | Accumulated holdings | 专业版 | `{"coin":"BTC"}` |
| `treasury_latest_entities` | Latest entities | 专业版 | `{"coin":"BTC"}` |
| `treasury_latest_history` | Latest history | 专业版 | `{"coin":"BTC"}` |
| `treasury_summary` | Holdings overview | 专业版 | `{"coin":"BTC"}` |

### scripts/features.mjs — Features & Signals

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `pair_ticker` | Pair ticker | 免费版 | `{"key_list":"btcusdt:okex,btcusdt:huobipro"}` |
| `ls_ratio` | Long/short ratio | 基础版 | None |
| `nav` | Market navigation | 基础版 | `{"language":"cn"}` |
| `pair_by_market` | Pairs by exchange | 基础版 | `{"market":"binance"}` |
| `pair_list` | Pair list | 基础版 | `{"market":"binance","currency":"USDT"}` |
| `grayscale_trust` | Grayscale trust | 标准版 | None |
| `gray_scale` | Grayscale holdings | 标准版 | `{"coins":"btc,eth"}` |
| `signal_alert` | Signal alerts | 标准版 | None |
| `signal_config` | Alert config | 标准版 | `{"language":"cn"}` |
| `strategy_signal` | Strategy signal | 标准版 | `{"signal_key":"depth_win_one"}` |
| `change_signal` | Anomaly signal | 标准版 | `{"type":"1"}` |
| `big_orders` | Whale orders | 标准版 | `{"symbol":"btcswapusdt:binance"}` |
| `agg_trades` | Aggregated large trades | 标准版 | `{"symbol":"btcswapusdt:binance"}` |
| `liquidation` | Liquidation data | 高级版 | `{"type":"1","coinKey":"bitcoin"}` |
| `signal_alert_list` | Alert list | 专业版 | None |
| `stock_market` | Crypto stocks | 专业版 | None |
| `delete_signal` | Delete alert | 专业版 | `{"id":"xxx"}` |

### scripts/news.mjs — News & Content

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `news_rss` | RSS news feed | 免费版 | `{"page":"1"}` |
| `news_list` | News list | 基础版 | `{"page":"1","page_size":"20"}` |
| `flash_list` | Industry flash news | 基础版 | `{"language":"cn"}` |
| `newsflash` | AiCoin flash news | 标准版 | `{"language":"cn"}` |
| `news_detail` | News detail | 标准版 | `{"id":"xxx"}` |
| `exchange_listing` | Exchange listing announcements | 专业版 | `{"memberIds":"477,1509"}` |

### scripts/twitter.mjs — Twitter/X Crypto Tweets

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `latest` | Latest crypto tweets | 基础版 | `{"language":"cn","page_size":"20"}` |
| `search` | Search tweets | 基础版 | `{"keyword":"bitcoin","language":"cn","page_size":"20"}` |
| `members` | Search KOL/users | 标准版 | `{"keyword":"elon","page":"1","page_size":"20"}` |
| `interaction_stats` | Tweet engagement stats | 标准版 | `{"flash_ids":"123,456,789"}` |

### scripts/newsflash.mjs — Newsflash (OpenData)

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `search` | Search newsflash | 基础版 | `{"keyword":"bitcoin","page":"1","page_size":"20"}` |
| `list` | Newsflash list with filters | 基础版 | `{"page_size":"20","language":"cn"}` |
| `detail` | Newsflash full content | 标准版 | `{"flash_id":"123456"}` |

### scripts/airdrop.mjs — Airdrop (OpenData)

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `list` | Airdrop projects list (multi-source) | 基础版 | `{"source":"all","status":"ongoing","page":"1","page_size":"20","exchange":"binance"}` |
| `detail` | Airdrop detail (hodler/xlaunch) | 标准版 | `{"type":"hodler","token":"SIGN"}` |
| `banner` | Hot airdrop banners | 基础版 | `{"limit":"5"}` |
| `exchanges` | Available exchanges and activity types | 基础版 | `{"lan":"cn"}` |
| `calendar` | Airdrop calendar (year+month required) | 标准版 | `{"year":"2026","month":"3"}` |

**Source options for list:** `all`(default), `hodler`, `xlaunch`, `earncoin`, `alpha`, `bitget_launchpool`, `bitget_poolx`

### scripts/drop_radar.mjs — Drop Radar (OpenData)

| Action | Description | Min Tier | Params |
|--------|-------------|----------|--------|
| `list` | Project list with filters | 基础版 | `{"page":"1","page_size":"20","status":"CONFIRMED","keyword":"airdrop"}` |
| `detail` | Project detail | 基础版 | `{"airdrop_id":"xxx"}` |
| `widgets` | Statistics overview | 基础版 | `{"lan":"cn"}` |
| `filters` | Available filter options | 基础版 | `{"lan":"cn"}` |
| `events` | Project event calendar | 标准版 | `{"airdrop_id":"xxx"}` |
| `team` | Project team members | 标准版 | `{"airdrop_id":"xxx"}` |
| `x_following` | Project X following list | 标准版 | `{"airdrop_id":"xxx"}` |
| `status_changes` | Recent status changes | 标准版 | `{"days":"7","page":"1","page_size":"20"}` |
| `tweets` | Search project tweets | 标准版 | `{"keywords":"bitcoin,airdrop","page_size":"20"}` |

## Cross-Skill References

| Need | Use |
|------|-----|
| Exchange trading (buy/sell/balance) | **aicoin-trading** |
| Freqtrade strategies/backtest/deploy | **aicoin-freqtrade** |
| Hyperliquid whale tracking | **aicoin-hyperliquid** |

## Common Errors

- `errorCode 304 / HTTP 403` — Paid feature. Script output includes upgrade link and instructions. Show them to user. Do NOT retry.
- `Invalid symbol` — Check format: AiCoin uses `btcusdt:okex`, not `BTC/USDT`
- `Rate limit exceeded` — Wait 1-2s between requests; use batch queries
