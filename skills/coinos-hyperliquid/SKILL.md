---
name: coinos-hyperliquid
description: "This skill should be used when the user asks about Hyperliquid whale positions, Hyperliquid liquidations, Hyperliquid open interest, Hyperliquid trader analytics, Hyperliquid taker data, smart money on Hyperliquid, or any Hyperliquid-specific query. Use when user says: 'Hyperliquid whales', 'HL whale positions', 'HL liquidations', 'HL open interest', 'HL trader', 'smart money', 'Hyperliquid大户', 'HL鲸鱼', 'HL持仓', 'HL清算', 'HL持仓量', 'HL交易员'. For general crypto prices/news, use coinos-market. For exchange trading, use coinos-trading. For Freqtrade, use coinos-freqtrade."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/aicoin-skills", "license": "MIT" } }
---

# CoinOS Hyperliquid

Hyperliquid whale tracking and analytics powered by [AiCoin Open API](https://www.aicoin.com/opendata).

**Version:** 1.0.0

## Critical Rules

1. **NEVER fabricate data.** Always run scripts to fetch real-time data.
2. **NEVER use curl, web_fetch, or browser.** Always use these scripts.
3. **NEVER run `env` or `printenv`** — leaks API secrets.
4. **Scripts auto-load `.env`** — never pass credentials inline.

## Quick Reference

| Task | Command |
|------|---------|
| All tickers | `node scripts/hl-market.mjs tickers` |
| BTC ticker | `node scripts/hl-market.mjs ticker '{"coin":"BTC"}'` |
| Whale positions | `node scripts/hl-market.mjs whale_positions '{"coin":"BTC","min_usd":"1000000"}'` |
| Whale events | `node scripts/hl-market.mjs whale_events '{"coin":"BTC"}'` |
| Whale directions | `node scripts/hl-market.mjs whale_directions '{"coin":"BTC"}'` |
| Liquidation history | `node scripts/hl-market.mjs liq_history '{"coin":"BTC"}'` |
| OI summary | `node scripts/hl-market.mjs oi_summary` |
| Trader stats | `node scripts/hl-trader.mjs trader_stats '{"address":"0x...","period":"30"}'` |
| Smart money | `node scripts/hl-trader.mjs smart_find` |

## Scripts

### scripts/hl-market.mjs — Market Data

#### Tickers
| Action | Description | Params |
|--------|-------------|--------|
| `tickers` | All tickers | None |
| `ticker` | Single coin | `{"coin":"BTC"}` |

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

### scripts/hl-trader.mjs — Trader Analytics

#### Trader Stats
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

## Cross-Skill References

| Need | Use |
|------|-----|
| Prices, K-lines, news | **coinos-market** |
| Exchange trading (buy/sell) | **coinos-trading** |
| Freqtrade strategies/backtest | **coinos-freqtrade** |

## Common Errors

- `Invalid coin` — Use uppercase: `BTC`, `ETH`, `SOL`
- `Address format` — Must be full `0x...` Ethereum address
- `Rate limit exceeded` — Wait 1-2s between requests

## Environment Variables

Scripts auto-load `.env`. Optional:
```
AICOIN_ACCESS_KEY_ID=your-api-key
AICOIN_ACCESS_SECRET=your-api-secret
PROXY_URL=socks5://127.0.0.1:7890  # optional
```
