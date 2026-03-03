---
name: aicoin
description: >
  AiCoin crypto data & trading toolkit — 40+ tools for real-time prices, AI analysis,
  funding rates, K-lines, whale tracking, Hyperliquid on-chain data, exchange trading
  (CCXT), and Freqtrade bot control. Scripts auto-load .env — just run them directly.
  If .env is missing, guide the user through the Setup Checklist in SKILL.md.
metadata:
  openclaw:
    primaryEnv: "AICOIN_ACCESS_KEY_ID"
    requires:
      bins:
        - "node"
    homepage: "https://www.aicoin.com/opendata"
    source: "https://github.com/aicoincom/aicoin-skills"
    license: "MIT"
---

# AiCoin

Crypto data & trading toolkit powered by [AiCoin Open API](https://www.aicoin.com/opendata).

## Setup Checklist

**Scripts auto-load `.env` files** from these locations (first found wins):
1. Current working directory (`.env`)
2. `~/.openclaw/workspace/.env`
3. `~/.openclaw/.env`

**Before asking the user for ANY credentials, first check if `.env` already exists:**

```bash
cat ~/.openclaw/workspace/.env 2>/dev/null || cat ~/.openclaw/.env 2>/dev/null || echo "NO_ENV_FOUND"
```

- If `.env` exists and contains `AICOIN_ACCESS_KEY_ID` → **skip AiCoin key setup, just run scripts directly**
- If `.env` exists but lacks `AICOIN_ACCESS_KEY_ID` → **the built-in free key works automatically, just run scripts**
- If no `.env` at all → **the built-in free key still works, just run scripts. Only ask about keys if the user wants their own paid key.**

**Only ask setup questions when the user explicitly requests features that need configuration:**
- Exchange trading (Binance, OKX, etc.) → needs exchange API keys + `cd <skill-dir>/aicoin && npm install` for ccxt
- Freqtrade bot control → needs `FREQTRADE_URL`, `FREQTRADE_USERNAME`, `FREQTRADE_PASSWORD`
- Proxy access → needs `PROXY_URL`

**Do NOT block the user from running commands. The skill works out of the box with the built-in free key.**

### SECURITY: How to Run Scripts

**Scripts auto-load `.env` — NEVER pass credentials inline.** Just run:

```bash
node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'
```

**NEVER do this** — it exposes secrets in conversation logs:
```bash
# WRONG! DO NOT DO THIS!
AICOIN_ACCESS_KEY_ID=xxx node scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'
```

If a script fails due to missing env vars, guide the user to update their `.env` file instead of injecting variables into the command.

### Environment Variables

Create a `.env` file in the OpenClaw workspace directory (recommended):

```bash
# AiCoin API (optional — built-in free key works with IP rate limits)
AICOIN_ACCESS_KEY_ID=your-key
AICOIN_ACCESS_SECRET=your-secret

# Exchange trading — only if needed (requires: npm install -g ccxt)
BINANCE_API_KEY=xxx
BINANCE_API_SECRET=xxx
# Supported: BINANCE, OKX, BYBIT, BITGET, GATE, HTX, KUCOIN, MEXC, COINBASE
# For OKX also set OKX_PASSWORD=xxx

# Proxy for exchange access — only if needed
# Supports http, https, socks5, socks4
PROXY_URL=socks5://127.0.0.1:7890
# Or standard env vars: HTTPS_PROXY=http://127.0.0.1:7890

# Freqtrade — only if needed
FREQTRADE_URL=http://localhost:8080
FREQTRADE_USERNAME=freqtrader
FREQTRADE_PASSWORD=your-password
```

Or configure in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "aicoin": {
        "enabled": true,
        "apiKey": "your-aicoin-access-key-id",
        "env": {
          "AICOIN_ACCESS_SECRET": "your-secret"
        }
      }
    }
  }
}
```

### Prerequisites

- **Node.js** — required for all scripts
- **ccxt** — required only for exchange trading: `cd <skill-dir>/aicoin && npm install`

## Scripts

All scripts follow: `node scripts/<name>.mjs <action> [json-params]`

---

### scripts/coin.mjs — Coin Data

| Action | Description | Params |
|--------|-------------|--------|
| `coin_list` | List all coins | None |
| `coin_ticker` | Real-time prices | `{"coin_list":"bitcoin,ethereum"}` |
| `coin_config` | Coin profile | `{"coin_list":"bitcoin"}` |
| `ai_analysis` | AI analysis & prediction | `{"coin_keys":"[\"bitcoin\"]","language":"CN"}` |
| `funding_rate` | Funding rate | `{"symbol":"btcswapusdt:binance","interval":"8h"}` Weighted: `{"symbol":"btcswapusdt","interval":"8h","weighted":"true"}` |
| `liquidation_map` | Liquidation heatmap | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `liquidation_history` | Liquidation history | `{"symbol":"btcswapusdt:binance","interval":"1m"}` |
| `estimated_liquidation` | Estimated liquidation | `{"dbkey":"btcswapusdt:binance","cycle":"24h"}` |
| `open_interest` | Open interest | `{"symbol":"BTC","interval":"15m"}` Coin-margined: add `"margin_type":"coin"` |
| `historical_depth` | Historical depth | `{"key":"btcswapusdt:okcoinfutures"}` |
| `super_depth` | Large order depth (>$10k) | `{"key":"btcswapusdt:okcoinfutures"}` |
| `trade_data` | Trade data | `{"dbkey":"btcswapusdt:okcoinfutures"}` |

---

### scripts/market.mjs — Market Data

#### Market Info
| Action | Description | Params |
|--------|-------------|--------|
| `exchanges` | Exchange list | None |
| `ticker` | Exchange tickers | `{"market_list":"okex,binance"}` |
| `hot_coins` | Trending coins | `{"key":"defi"}` key: gamefi/anonymous/market/web/newcoin/stable/defi |
| `futures_interest` | Futures OI ranking | `{"lan":"cn"}` |

#### K-Line
| Action | Description | Params |
|--------|-------------|--------|
| `kline` | Standard K-line | `{"symbol":"btcusdt:okex","period":"3600","size":"100"}` period in seconds: 900=15m, 3600=1h, 14400=4h, 86400=1d |
| `indicator_kline` | Indicator K-line | `{"symbol":"btcswapusdt:binance","indicator_key":"fundflow","period":"3600"}` |
| `indicator_pairs` | Indicator available pairs | `{"indicator_key":"fundflow"}` |

#### Index
| Action | Description | Params |
|--------|-------------|--------|
| `index_list` | Index list | None |
| `index_price` | Index price | `{"key":"i:diniw:ice"}` |
| `index_info` | Index details | `{"key":"i:diniw:ice"}` |

#### Crypto Stocks
| Action | Description | Params |
|--------|-------------|--------|
| `stock_quotes` | Stock quotes | `{"tickers":"i:mstr:nasdaq,i:coin:nasdaq"}` |
| `stock_top_gainer` | Top gainers | `{"us_stock":"true"}` |
| `stock_company` | Company details | `{"symbol":"i:mstr:nasdaq"}` |

#### Treasury (Corporate Holdings)
| Action | Description | Params |
|--------|-------------|--------|
| `treasury_entities` | Holding entities | `{"coin":"BTC"}` |
| `treasury_history` | Transaction history | `{"coin":"BTC"}` |
| `treasury_accumulated` | Accumulated holdings | `{"coin":"BTC"}` |
| `treasury_latest_entities` | Latest entities | `{"coin":"BTC"}` |
| `treasury_latest_history` | Latest history | `{"coin":"BTC"}` |
| `treasury_summary` | Holdings overview | `{"coin":"BTC"}` |

#### Order Book Depth
| Action | Description | Params |
|--------|-------------|--------|
| `depth_latest` | Real-time snapshot | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_full` | Full order book | `{"dbKey":"btcswapusdt:binance"}` |
| `depth_grouped` | Grouped depth | `{"dbKey":"btcswapusdt:binance","groupSize":"100"}` |

---

### scripts/news.mjs — News & Content

| Action | Description | Params |
|--------|-------------|--------|
| `news_list` | News list | `{"page":"1","pageSize":"20"}` |
| `news_detail` | News detail | `{"id":"xxx"}` |
| `news_rss` | RSS news | `{"page":"1"}` |
| `newsflash` | AiCoin flash news | `{"language":"cn"}` |
| `flash_list` | Industry flash news | `{"language":"cn"}` |
| `exchange_listing` | Exchange listing announcements | `{"memberIds":"477,1509"}` (477=Binance, 1509=Bitget) |

---

### scripts/features.mjs — Features & Signals

#### Market Overview
| Action | Description | Params |
|--------|-------------|--------|
| `nav` | Market navigation | `{"lan":"cn"}` |
| `ls_ratio` | Long/short ratio | None |
| `liquidation` | Liquidation data | `{"type":"1","coinKey":"bitcoin"}` type: 1=by coin, 2=by exchange |
| `grayscale_trust` | Grayscale trust | None |
| `gray_scale` | Grayscale holdings | `{"coins":"btc,eth"}` |
| `stock_market` | Crypto stocks | None |

#### Whale Order Tracking
| Action | Description | Params |
|--------|-------------|--------|
| `big_orders` | Large/whale orders | `{"symbol":"btcswapusdt:binance"}` |
| `agg_trades` | Aggregated large trades | `{"symbol":"btcswapusdt:binance"}` |

#### Trading Pairs
| Action | Description | Params |
|--------|-------------|--------|
| `pair_ticker` | Pair ticker | `{"key_list":"btcusdt:okex,btcusdt:huobipro"}` |
| `pair_by_market` | Pairs by exchange | `{"market":"binance"}` |
| `pair_list` | Pair list | `{"market":"binance","currency":"USDT"}` |

#### Signals
| Action | Description | Params |
|--------|-------------|--------|
| `strategy_signal` | Strategy signal | `{"signal_key":"depth_win_one"}` |
| `signal_alert` | Signal alerts | None |
| `signal_config` | Alert config | `{"lan":"cn"}` |
| `signal_alert_list` | Alert list | None |
| `change_signal` | Anomaly signal | `{"type":"1"}` |
| `delete_signal` | Delete alert | `{"id":"xxx"}` |

---

### scripts/hl-market.mjs — Hyperliquid Market

#### Tickers
| Action | Description | Params |
|--------|-------------|--------|
| `tickers` | All tickers | None |
| `ticker` | Single coin ticker | `{"coin":"BTC"}` |

#### Whales
| Action | Description | Params |
|--------|-------------|--------|
| `whale_positions` | Whale positions | `{"coin":"BTC","min_usd":"1000000"}` |
| `whale_events` | Whale events | `{"coin":"BTC"}` |
| `whale_directions` | Long/short direction | `{"coin":"BTC"}` |
| `whale_history_ratio` | Historical long ratio | `{"coin":"BTC"}` |

#### Liquidations
| Action | Description | Params |
|--------|-------------|--------|
| `liq_history` | Liquidation history | `{"coin":"BTC"}` |
| `liq_stats` | Liquidation stats | None |
| `liq_stats_by_coin` | Stats by coin | `{"coin":"BTC"}` |
| `liq_top_positions` | Large liquidations | `{"coin":"BTC","interval":"1d"}` |

#### Open Interest
| Action | Description | Params |
|--------|-------------|--------|
| `oi_summary` | OI overview | None |
| `oi_top_coins` | OI ranking | `{"limit":"10"}` |
| `oi_history` | OI history | `{"coin":"BTC","interval":"4h"}` |

#### Taker
| Action | Description | Params |
|--------|-------------|--------|
| `taker_delta` | Taker delta | `{"coin":"BTC"}` |
| `taker_klines` | Taker K-lines | `{"coin":"BTC","interval":"4h"}` |

---

### scripts/hl-trader.mjs — Hyperliquid Trader

#### Trader Analytics
| Action | Description | Params |
|--------|-------------|--------|
| `trader_stats` | Trader statistics | `{"address":"0x...","period":"30"}` |
| `best_trades` | Best trades | `{"address":"0x...","period":"30"}` |
| `performance` | Performance by coin | `{"address":"0x...","period":"30"}` |
| `completed_trades` | Completed trades | `{"address":"0x...","coin":"BTC"}` |
| `accounts` | Batch accounts | `{"addresses":"[\"0x...\"]"}` |
| `statistics` | Batch statistics | `{"addresses":"[\"0x...\"]"}` |

#### Fills
| Action | Description | Params |
|--------|-------------|--------|
| `fills` | Address fills | `{"address":"0x..."}` |
| `fills_by_oid` | By order ID | `{"oid":"xxx"}` |
| `fills_by_twapid` | By TWAP ID | `{"twapid":"xxx"}` |
| `top_trades` | Large trades | `{"coin":"BTC","interval":"1d"}` |

#### Orders
| Action | Description | Params |
|--------|-------------|--------|
| `orders_latest` | Latest orders | `{"address":"0x..."}` |
| `order_by_oid` | By order ID | `{"oid":"xxx"}` |
| `filled_orders` | Filled orders | `{"address":"0x..."}` |
| `filled_by_oid` | Filled by ID | `{"oid":"xxx"}` |
| `top_open` | Large open orders | `{"coin":"BTC","min_val":"100000"}` |
| `active_stats` | Active stats | `{"coin":"BTC"}` |
| `twap_states` | TWAP states | `{"address":"0x..."}` |

#### Positions
| Action | Description | Params |
|--------|-------------|--------|
| `current_pos_history` | Current position history | `{"address":"0x...","coin":"BTC"}` |
| `completed_pos_history` | Closed position history | `{"address":"0x...","coin":"BTC"}` |
| `current_pnl` | Current PnL | `{"address":"0x...","coin":"BTC","interval":"1h"}` |
| `completed_pnl` | Closed PnL | `{"address":"0x...","coin":"BTC","interval":"1h"}` |
| `current_executions` | Current executions | `{"address":"0x...","coin":"BTC","interval":"1h"}` |
| `completed_executions` | Closed executions | `{"address":"0x...","coin":"BTC","interval":"1h"}` |

#### Portfolio
| Action | Description | Params |
|--------|-------------|--------|
| `portfolio` | Account curve | `{"address":"0x...","window":"week"}` window: day/week/month/allTime |
| `pnls` | PnL curve | `{"address":"0x...","period":"30"}` |
| `max_drawdown` | Max drawdown | `{"address":"0x...","days":"30"}` |
| `net_flow` | Net flow | `{"address":"0x...","days":"30"}` |

#### Advanced
| Action | Description | Params |
|--------|-------------|--------|
| `info` | Info API | `{"type":"metaAndAssetCtxs"}` |
| `smart_find` | Smart money discovery | `{}` |
| `discover` | Trader discovery | `{}` |

---

### scripts/exchange.mjs — Exchange Trading (CCXT)

Requires `npm install ccxt` and exchange API keys.

#### Public (no API key required)
| Action | Description | Params |
|--------|-------------|--------|
| `exchanges` | Supported exchanges | None |
| `markets` | Market list | `{"exchange":"binance","market_type":"swap","base":"BTC"}` |
| `ticker` | Real-time ticker | `{"exchange":"binance","symbol":"BTC/USDT"}` |
| `orderbook` | Order book | `{"exchange":"binance","symbol":"BTC/USDT"}` |
| `trades` | Recent trades | `{"exchange":"binance","symbol":"BTC/USDT"}` |
| `ohlcv` | OHLCV candles | `{"exchange":"binance","symbol":"BTC/USDT","timeframe":"1h"}` |

#### Account (API key required)
| Action | Description | Params |
|--------|-------------|--------|
| `balance` | Account balance | `{"exchange":"binance"}` |
| `positions` | Open positions | `{"exchange":"binance","market_type":"swap"}` |
| `open_orders` | Open orders | `{"exchange":"binance","symbol":"BTC/USDT"}` |

#### Trading (API key required)
| Action | Description | Params |
|--------|-------------|--------|
| `create_order` | Place order | `{"exchange":"binance","symbol":"BTC/USDT","type":"limit","side":"buy","amount":0.01,"price":60000}` |
| `cancel_order` | Cancel order | `{"exchange":"binance","symbol":"BTC/USDT","order_id":"xxx"}` |
| `set_leverage` | Set leverage | `{"exchange":"binance","symbol":"BTC/USDT","leverage":10}` |
| `set_margin_mode` | Margin mode | `{"exchange":"binance","symbol":"BTC/USDT","margin_mode":"cross"}` |
| `transfer` | Transfer funds | `{"exchange":"binance","code":"USDT","amount":100,"from_account":"spot","to_account":"future"}` |

---

### scripts/ft.mjs — Freqtrade Bot Control

| Action | Description | Params |
|--------|-------------|--------|
| `ping` | Health check | None |
| `start` | Start trading | None |
| `stop` | Stop trading | None |
| `reload` | Reload config | None |
| `config` | View config | None |
| `version` | Version info | None |
| `sysinfo` | System info | None |
| `health` | Health status | None |
| `logs` | View logs | `{"limit":50}` |
| `balance` | Account balance | None |
| `trades_open` | Open trades | None |
| `trades_count` | Trade count | None |
| `trade_by_id` | Trade by ID | `{"trade_id":1}` |
| `trades_history` | Trade history | `{"limit":50}` |
| `force_enter` | Manual entry | `{"pair":"BTC/USDT","side":"long"}` |
| `force_exit` | Manual exit | `{"tradeid":"1"}` |
| `cancel_order` | Cancel order | `{"trade_id":1}` |
| `delete_trade` | Delete record | `{"trade_id":1}` |
| `profit` | Profit summary | None |
| `profit_per_pair` | Profit per pair | None |
| `daily` | Daily report | `{"count":7}` |
| `weekly` | Weekly report | `{"count":4}` |
| `monthly` | Monthly report | `{"count":3}` |
| `stats` | Statistics | None |

---

### scripts/ft-dev.mjs — Freqtrade Dev Tools

| Action | Description | Params |
|--------|-------------|--------|
| `backtest_start` | Start backtest | `{"strategy":"MyStrategy","timerange":"20240101-20240601","timeframe":"5m"}` |
| `backtest_status` | Backtest status | None |
| `backtest_abort` | Abort backtest | None |
| `backtest_history` | Backtest history | None |
| `backtest_result` | History result | `{"id":"xxx"}` |
| `candles_live` | Live candles | `{"pair":"BTC/USDT","timeframe":"1h"}` |
| `candles_analyzed` | Candles with indicators | `{"pair":"BTC/USDT","timeframe":"1h","strategy":"MyStrategy"}` |
| `candles_available` | Available pairs | None |
| `whitelist` | Whitelist | None |
| `blacklist` | Blacklist | None |
| `blacklist_add` | Add to blacklist | `{"add":["DOGE/USDT"]}` |
| `locks` | Trade locks | None |
| `strategy_list` | Strategy list | None |
| `strategy_get` | Strategy detail | `{"name":"MyStrategy"}` |
