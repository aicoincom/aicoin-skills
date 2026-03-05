---
name: coinos-trading
description: "This skill should be used when the user asks about exchange trading, placing orders, checking balance, viewing positions, order history, market list, leverage, margin mode, transferring funds, or automated trading. Use when user says: 'buy BTC', 'sell ETH', 'check balance', 'place order', 'open long', 'open short', 'close position', 'set leverage', 'auto trade', 'view positions', '下单', '买入', '卖出', '查余额', '做多', '做空', '平仓', '设杠杆', '自动交易', '合约交易', '现货交易'. Supports Binance, OKX, Bybit, Bitget, Gate.io, HTX, KuCoin, MEXC, Coinbase. For crypto prices/charts/news, use coinos-market. For Freqtrade strategies, use coinos-freqtrade. For Hyperliquid, use coinos-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/aicoin-skills", "license": "MIT" } }
---

# CoinOS Trading

Exchange trading toolkit powered by [AiCoin Open API](https://www.aicoin.com/opendata). Buy, sell, manage positions across 9 major exchanges.

**Version:** 1.0.0

## Critical Rules

1. **NEVER place orders without explicit user confirmation.** `create_order` returns a preview first. Show it, wait for "确认"/"yes", THEN re-run with `"confirmed":"true"`.
2. **NEVER auto-adjust order parameters** (size, leverage). If balance is insufficient, tell the user.
3. **NEVER sell or close positions** unless the user specifically asks.
4. **NEVER write custom CCXT/Python code.** ALL exchange operations MUST go through `exchange.mjs`.
5. **NEVER run `env` or `printenv`** — leaks API secrets.
6. **Scripts auto-load `.env`** — never pass credentials inline.

## Quick Reference

| Task | Command |
|------|---------|
| Balance | `node scripts/exchange.mjs balance '{"exchange":"okx"}'` |
| Ticker | `node scripts/exchange.mjs ticker '{"exchange":"binance","symbol":"BTC/USDT"}'` |
| Orderbook | `node scripts/exchange.mjs orderbook '{"exchange":"binance","symbol":"BTC/USDT"}'` |
| Buy (preview) | `node scripts/exchange.mjs create_order '{"exchange":"okx","symbol":"BTC/USDT","type":"market","side":"buy","amount":0.001}'` |
| Positions | `node scripts/exchange.mjs positions '{"exchange":"okx","market_type":"swap"}'` |
| Set leverage | `node scripts/exchange.mjs set_leverage '{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":10,"market_type":"swap"}'` |
| Auto-trade setup | `node scripts/auto-trade.mjs setup '{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":10,"capital_pct":0.5}'` |

**Supported Exchanges:** Binance, OKX, Bybit, Bitget, Gate.io, HTX, KuCoin, MEXC, Coinbase.

**Symbol format:** CCXT format — `BTC/USDT` (spot), `BTC/USDT:USDT` (swap/futures).

## Setup

Requires exchange API keys in `.env` and ccxt installed (`npm install` in this skill directory).

`.env` locations (auto-loaded, first found wins):
1. Current working directory
2. `~/.openclaw/workspace/.env`
3. `~/.openclaw/.env`

```
BINANCE_API_KEY=xxx
BINANCE_API_SECRET=xxx
# Supported: BINANCE, OKX, BYBIT, BITGET, GATE, HTX, KUCOIN, MEXC, COINBASE
# OKX also needs: OKX_PASSWORD=xxx
PROXY_URL=socks5://127.0.0.1:7890  # optional
```

## Pre-Trade Checklist (MANDATORY)

Before placing ANY order:

1. **`markets`** — Get `limits.amount.min` and `contractSize`. NEVER guess minimums.
2. **`balance`** — Check available funds.
3. **Convert units** — `amount` differs between spot and futures:
   - **Spot**: amount = base currency (e.g., 0.01 = 0.01 BTC)
   - **Futures**: amount = contracts (e.g., 1 = 1 contract). Use `contractSize` to convert.
4. **Confirm with user** — Show coin, direction, quantity, estimated cost, leverage. Ask "确认下单？"

| User says | Spot amount | Swap amount (OKX BTC, contractSize=0.01) |
|-----------|------------|------------------------------------------|
| "0.01 BTC" | `0.01` | `0.01 / 0.01 = 1` (1 contract) |
| "1张合约" | N/A | `1` |
| "100U" | `100 / price` | `(100 / price) / contractSize` |

## Scripts

### scripts/exchange.mjs — Exchange Operations (CCXT)

#### Public (no API key)
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
| `closed_orders` | Order history | `{"exchange":"binance","symbol":"BTC/USDT","limit":50}` |
| `my_trades` | Trade history | `{"exchange":"binance","symbol":"BTC/USDT","limit":50}` |
| `fetch_order` | Order by ID | `{"exchange":"binance","symbol":"BTC/USDT","order_id":"xxx"}` |

#### Trading (API key required)
| Action | Description | Params |
|--------|-------------|--------|
| `create_order` | Place order | Spot: `{"exchange":"okx","symbol":"BTC/USDT","type":"market","side":"buy","amount":0.001}` Swap: `{"exchange":"okx","symbol":"BTC/USDT:USDT","type":"market","side":"buy","amount":1,"market_type":"swap"}` |
| `cancel_order` | Cancel order | `{"exchange":"okx","symbol":"BTC/USDT","order_id":"xxx"}` |
| `set_leverage` | Set leverage | `{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":10,"market_type":"swap"}` |
| `set_margin_mode` | Margin mode | `{"exchange":"okx","symbol":"BTC/USDT:USDT","margin_mode":"cross","market_type":"swap"}` |
| `transfer` | Transfer funds | `{"exchange":"binance","code":"USDT","amount":100,"from_account":"spot","to_account":"future"}` |

**Transfer notes:**
- Account names: `spot`, `future`, `delivery`, `margin`, `funding` (exact values).
- **OKX unified account**: Spot and derivatives share balance. No transfer needed. Error 58123 = unified account.
- **Binance**: Requires explicit transfer between spot/futures.

### scripts/auto-trade.mjs — Automated Trading

Config stored at `~/.openclaw/workspace/aicoin-trade-config.json`.

| Action | Description | Params |
|--------|-------------|--------|
| `setup` | Save trading config | `{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":20,"capital_pct":0.5,"stop_loss_pct":0.025,"take_profit_pct":0.05}` |
| `status` | Config + balance + positions | `{}` |
| `open` | Open position | `{"direction":"long"}` or `{"direction":"short"}` |
| `close` | Close position + cancel orders | `{}` |

The `open` action automatically: checks balance, calculates position size (capital_pct x balance x leverage), sets leverage, places market order, sets SL/TP.

### Automated Trading Workflow

1. Ask user: exchange, coin, capital, leverage
2. `auto-trade.mjs setup` with params
3. `auto-trade.mjs status` to verify
4. Set up OpenClaw cron:
```bash
openclaw cron add --name "BTC auto trade" --every 10m --session isolated \
  --message "Use coinos-market to fetch data, analyze, then use coinos-trading auto-trade.mjs open/close"
```

## Cross-Skill References

| Need | Use |
|------|-----|
| Prices, K-lines, news, signals | **coinos-market** |
| Freqtrade strategies/backtest | **coinos-freqtrade** |
| Hyperliquid whale tracking | **coinos-hyperliquid** |

## Common Errors

- `Invalid symbol` — Use CCXT format: `BTC/USDT` (spot), `BTC/USDT:USDT` (swap)
- `Insufficient balance` — Check balance first, don't auto-adjust. Tell user.
- `API key invalid` — Keys in `.env`, never inline. Check if user configured exchange keys.
- `Rate limit exceeded` — Wait 1-2s between requests.
- OKX error 58123 — Unified account, no transfer needed between spot/futures.
