---
name: aicoin-freqtrade
description: "This skill should be used when the user asks about writing trading strategies, backtesting, deploying Freqtrade bots, quantitative trading, strategy optimization, or any Freqtrade-related operation. Use when user says: 'write strategy', 'create strategy', 'backtest', 'deploy Freqtrade', 'deploy bot', 'quantitative trading', 'strategy optimization', 'hyperopt', 'live trading bot', '写策略', '创建策略', '回测', '部署Freqtrade', '部署机器人', '量化交易', '量化策略', '策略优化', '超参数优化', '实盘机器人'. IMPORTANT: ALWAYS use create_strategy to generate strategy files. NEVER write Python strategy code by hand. For crypto prices/charts, use aicoin-market. For exchange trading, use aicoin-trading. For Hyperliquid, use aicoin-hyperliquid."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/coinos-skills", "license": "MIT" } }
---

# AiCoin Freqtrade

Freqtrade strategy creation, backtesting, and deployment powered by [AiCoin Open API](https://www.aicoin.com/opendata).

**Version:** 1.0.0

## STRATEGY CREATION — USE create_strategy

**⚠️ ABSOLUTE RULE: You MUST use `create_strategy` to generate strategy files. NEVER write Python strategy code by hand. NEVER create .py files directly. NEVER use custom backtest scripts. If the user wants a strategy that seems complex, use `create_strategy` with the appropriate `indicators` parameter — it supports 17+ technical indicators. There is NO scenario where you should bypass `create_strategy`.**

```bash
# Generate a strategy with specific indicators
node scripts/ft-deploy.mjs create_strategy '{"name":"MACDStrategy","timeframe":"15m","indicators":["macd","rsi","atr"],"description":"MACD金叉+RSI过滤+ATR止损"}'

# Generate a Bollinger + KDJ strategy
node scripts/ft-deploy.mjs create_strategy '{"name":"BBKDJStrategy","timeframe":"1h","indicators":["bb","stochastic","volume_sma"],"description":"布林带+KDJ超买超卖策略"}'

# Generate with AiCoin data
node scripts/ft-deploy.mjs create_strategy '{"name":"WhaleStrat","timeframe":"15m","indicators":["rsi","macd"],"aicoin_data":["funding_rate","ls_ratio"],"description":"鲸鱼+技术指标策略"}'

# Default (RSI + BB + EMA + Volume SMA)
node scripts/ft-deploy.mjs create_strategy '{"name":"SimpleRSI","timeframe":"1h"}'
```

### Available Technical Indicators (in `indicators` array)

| Indicator | Key | Description |
|-----------|-----|-------------|
| RSI | `rsi` | 相对强弱指标 (14周期) |
| Bollinger Bands | `bb` | 布林带 (20周期) |
| EMA | `ema` | 指数移动平均 (8/21) |
| SMA | `sma` | 简单移动平均 (10/50) |
| MACD | `macd` | MACD + Signal + Histogram |
| Stochastic/KDJ | `stochastic` or `kdj` | 随机指标 K/D/J |
| ATR | `atr` | 平均真实波幅 |
| ADX | `adx` | 平均方向指数 + DI+/DI- |
| CCI | `cci` | 商品通道指数 |
| Williams %R | `williams_r` | 威廉指标 |
| VWAP | `vwap` | 成交量加权均价 |
| Ichimoku | `ichimoku` | 一目均衡表 |
| Volume SMA | `volume_sma` | 成交量均线 |
| OBV | `obv` | 能量潮指标 |

**Example**: User says "帮我写一个MACD金叉+布林带的策略" → use `"indicators":["macd","bb"]`

**`aicoin_data` options** (combine any):

| Data source | What it does | AiCoin tier |
|-------------|-------------|-------------|
| `funding_rate` | Extreme funding = over-leveraged, trade against | Basic ($29/mo) |
| `ls_ratio` | Contrarian signal from retail long/short ratio | Basic ($29/mo) |
| `big_orders` | Whale buy/sell pressure from institutional orders | Standard ($79/mo) |
| `open_interest` | Detect OI spikes = fragile market | Professional ($699/mo) |
| `liquidation_map` | Liquidation cascade direction bias | Advanced ($299/mo) |

### Strategy Generation Rules for Agent

All `aicoin_data` options require a paid API key. Based on the user's strategy description:

- **If strategy needs AiCoin data** (`funding_rate`, `ls_ratio`, `big_orders`, `open_interest`, `liquidation_map`):
  1. **Do NOT silently include it.** First inform the user that this data requires a paid API key.
  2. Tell them which tier is needed (see table above).
  3. Guide them: get API key at https://www.aicoin.com/opendata → add `AICOIN_ACCESS_KEY_ID` & `AICOIN_ACCESS_SECRET` to `.env`.
  4. Only include the paid data after user confirms they have the key configured.
- **If strategy does NOT need AiCoin data**: Generate a pure technical indicator strategy (RSI, EMA, Bollinger, etc.) — works for everyone out of the box.

**After generating, backtest immediately:**
```bash
node scripts/ft-deploy.mjs backtest '{"strategy":"MyStrategy","timeframe":"15m","timerange":"20250101-20260301"}'
```

## Critical Rules

1. **ALWAYS use `create_strategy`** to write strategies. **NEVER hand-write Python strategy files. NEVER create .py files manually. NEVER bypass create_strategy for any reason.** The tool supports 17+ indicators — use the `indicators` parameter.
2. **ALWAYS use `ft-deploy.mjs backtest`** for backtesting. NEVER write custom Python backtest scripts. NEVER use simulated/fabricated data.
3. **ALWAYS use `ft-deploy.mjs deploy`** for deployment. NEVER use Docker. NEVER manually run `freqtrade` commands.
4. **NEVER manually edit Freqtrade config files.** Use `ft-deploy.mjs` actions.
5. **NEVER manually run `freqtrade trade`, `source .venv/bin/activate`, or `pip install freqtrade`.**
6. **When user describes a custom strategy**: Map their description to the available `indicators` list. For example: "MACD金叉策略" → `indicators:["macd"]`; "布林带+KDJ" → `indicators:["bb","stochastic"]`; "趋势跟踪" → `indicators:["adx","ema","atr"]`.

## Quick Reference

| Task | Command |
|------|---------|
| Create strategy | `node scripts/ft-deploy.mjs create_strategy '{"name":"MyStrat","timeframe":"15m","indicators":["rsi","macd","bb"],"aicoin_data":["funding_rate"]}'` |
| Backtest | `node scripts/ft-deploy.mjs backtest '{"strategy":"MyStrat","timeframe":"1h","timerange":"20250101-20260301"}'` |
| Deploy (dry-run) | `node scripts/ft-deploy.mjs deploy '{"pairs":["BTC/USDT:USDT"]}'` |
| Deploy (live) | `node scripts/ft-deploy.mjs deploy '{"dry_run":false,"pairs":["BTC/USDT:USDT"]}'` |
| Hyperopt | `node scripts/ft-deploy.mjs hyperopt '{"strategy":"MyStrat","timeframe":"1h","timerange":"20250101-20260301","epochs":100}'` |
| Strategy list | `node scripts/ft-deploy.mjs strategy_list` |
| Bot status | `node scripts/ft-deploy.mjs status` |
| Bot logs | `node scripts/ft-deploy.mjs logs '{"lines":50}'` |
| Check profit | `node scripts/ft.mjs profit` |
| Open trades | `node scripts/ft.mjs trades_open` |

## Setup

**Prerequisites:** Python 3.11+ and git.

### Environment Variables

`.env` auto-loaded from (first found wins):
1. Current working directory
2. `~/.openclaw/workspace/.env`
3. `~/.openclaw/.env`

**Exchange keys** (required for live/dry-run trading):
```
# Same format as aicoin-trading skill
BINANCE_API_KEY=xxx
BINANCE_API_SECRET=xxx
# Or OKX, Bybit, etc. — see aicoin-trading skill for full list
```

**AiCoin API key** (required if strategy uses `aicoin_data`):
```
AICOIN_ACCESS_KEY_ID=your-key-id
AICOIN_ACCESS_SECRET=your-secret
```
Get at https://www.aicoin.com/opendata. See [Paid Feature Guide](#paid-feature-guide) for tier details.

**安全说明：** AiCoin API Key 仅用于获取市场数据，无法进行任何交易操作。交易所 API Key 需单独到交易所申请。所有密钥仅保存在本地设备 `.env` 文件中，不会上传到任何服务器。

### Deploy

**Deploy is one command:**
```bash
node scripts/ft-deploy.mjs check    # Check prerequisites
node scripts/ft-deploy.mjs deploy '{"pairs":["BTC/USDT:USDT","ETH/USDT:USDT"]}'
```

This automatically: clones Freqtrade, runs `setup.sh -i`, creates config from `.env`, starts background process, writes `FREQTRADE_*` vars to `.env`.

**Deploy defaults to dry-run (simulated trading).** Pass `{"dry_run":false}` for live.

## Scripts

### scripts/ft-deploy.mjs — Deployment & Strategy

| Action | Description | Params |
|--------|-------------|--------|
| `check` | Check prerequisites | None |
| `deploy` | Deploy Freqtrade | `{"dry_run":true,"pairs":["BTC/USDT:USDT"]}` |
| `backtest` | Run backtest | `{"strategy":"SampleStrategy","timeframe":"1h","timerange":"20250101-20260301"}` |
| `hyperopt` | Parameter optimization | `{"strategy":"MyStrat","timeframe":"1h","timerange":"20250101-20260301","epochs":100}` |
| `create_strategy` | Generate strategy file | `{"name":"MyStrat","timeframe":"15m","indicators":["rsi","macd","bb","atr"],"aicoin_data":["funding_rate","ls_ratio"]}` — `indicators` is optional (defaults to rsi,bb,ema,volume_sma). See indicator list above. |
| `strategy_list` | List strategies | None |
| `update` | Update Freqtrade | None |
| `status` | Process status | None |
| `start` | Start process | None |
| `stop` | Stop process | None |
| `logs` | View logs | `{"lines":50}` |
| `remove` | Remove process | None |

### scripts/ft.mjs — Bot Control (requires running process)

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

### scripts/ft-dev.mjs — Dev Tools (requires running process)

| Action | Description | Params |
|--------|-------------|--------|
| `backtest_start` | Start backtest | `{"strategy":"MyStrat","timerange":"20240101-20240601","timeframe":"5m"}` |
| `backtest_status` | Backtest status | None |
| `backtest_abort` | Abort backtest | None |
| `backtest_history` | Backtest history | None |
| `backtest_result` | History result | `{"id":"xxx"}` |
| `candles_live` | Live candles | `{"pair":"BTC/USDT","timeframe":"1h"}` |
| `candles_analyzed` | Candles with indicators | `{"pair":"BTC/USDT","timeframe":"1h","strategy":"MyStrat"}` |
| `candles_available` | Available pairs | None |
| `whitelist` | Whitelist | None |
| `blacklist` | Blacklist | None |
| `blacklist_add` | Add to blacklist | `{"add":["DOGE/USDT"]}` |
| `locks` | Trade locks | None |
| `strategy_list` | Strategy list | None |
| `strategy_get` | Strategy detail | `{"name":"MyStrat"}` |

## Built-in AiCoin Strategies

Auto-installed on deploy:
- **FundingRateStrategy** — Exploit extreme funding rates for mean reversion (Basic tier)
- **WhaleFollowStrategy** — Follow whale order flow + contrarian L/S ratio (Standard tier)
- **LiquidationHunterStrategy** — Profit from liquidation cascades (Advanced tier)

## User Journey

```
"帮我写一个MACD+布林带策略"
  → node scripts/ft-deploy.mjs create_strategy '{"name":"MACDBBStrategy","timeframe":"15m","indicators":["macd","bb","volume_sma"],"description":"MACD金叉+布林带突破"}'

"帮我写一个资金费率策略"
  → node scripts/ft-deploy.mjs create_strategy '{"name":"FundingStrat","timeframe":"15m","indicators":["rsi","ema"],"aicoin_data":["funding_rate"]}'

"回测一下"
  → node scripts/ft-deploy.mjs backtest '{"strategy":"MACDBBStrategy","timeframe":"15m","timerange":"20250101-20260301"}'

"不错，部署"
  → node scripts/ft-deploy.mjs deploy '{"pairs":["BTC/USDT:USDT"]}'

"上实盘"
  → node scripts/ft-deploy.mjs deploy '{"dry_run":false}'

"今天赚了多少？"
  → node scripts/ft.mjs profit
```

### Strategy Mapping Examples

When users describe strategies in natural language, map to `indicators`:

| User says | indicators | aicoin_data |
|-----------|-----------|-------------|
| "MACD策略" | `["macd"]` | — |
| "布林带+RSI" | `["bb","rsi"]` | — |
| "KDJ超买超卖" | `["stochastic"]` | — |
| "趋势跟踪策略" | `["adx","ema","atr"]` | — |
| "均线交叉" | `["sma"]` or `["ema"]` | — |
| "一目均衡表" | `["ichimoku"]` | — |
| "量价策略" | `["vwap","obv"]` | — |
| "资金费率做反向" | `["rsi","ema"]` | `["funding_rate"]` |
| "跟鲸鱼操作" | `["rsi","macd"]` | `["big_orders"]` |
| "综合策略" | `["rsi","macd","bb","adx"]` | — |

## Cross-Skill References

| Need | Use |
|------|-----|
| Prices, K-lines, market data | **aicoin-market** |
| Exchange trading (buy/sell) | **aicoin-trading** |
| Hyperliquid whale tracking | **aicoin-hyperliquid** |

## Common Errors

- `errorCode 304 / HTTP 403` — Paid AiCoin feature. **Do NOT retry.** See [Paid Feature Guide](#paid-feature-guide) below.
- `Python not found` — Need Python 3.11+. `ft-deploy.mjs check` validates this.
- `Strategy not found` — Check `ft-deploy.mjs strategy_list`. File must be in `~/.freqtrade/user_data/strategies/`.
- `Timerange format` — Use `YYYYMMDD-YYYYMMDD` (e.g., `20250101-20260301`).
- `Timeout` — Freqtrade ops may take 5+ min. Use `ft-deploy.mjs` which handles timeouts.

## Paid Feature Guide

When a script returns 304 or 403: **Do NOT retry.** Tell the user:

1. **What happened**: This AiCoin data feature needs a paid API subscription.
2. **How to get a key**: Visit https://www.aicoin.com/opendata to register and create an API key.
3. **Tier options** (for `aicoin_data` in strategies):

| Tier | Price | Strategy Data |
|------|-------|--------------|
| Free | $0 | Pure technical indicators only (no `aicoin_data`) |
| Basic | $29/mo | + `funding_rate`, `ls_ratio` |
| Standard | $79/mo | + `big_orders` |
| Advanced | $299/mo | + `liquidation_map` |
| Professional | $699/mo | + `open_interest` |

4. **How to configure**: Add to `.env` file:
```
AICOIN_ACCESS_KEY_ID=your-key-id
AICOIN_ACCESS_SECRET=your-secret
```
5. `.env` auto-loaded from: cwd → `~/.openclaw/workspace/.env` → `~/.openclaw/.env`. After configuring, the same script command will work.
6. **MUST tell the user**: AiCoin API Key 仅用于获取市场数据，无法进行任何交易操作。如需在交易所下单，需要单独到交易所申请交易 API Key。所有密钥仅保存在你的本地设备 `.env` 文件中，不会上传到任何服务器。

## Troubleshooting

1. Check Python: `python3 --version` (need 3.11+)
2. Check logs: `node scripts/ft-deploy.mjs logs`
3. Verify exchange keys in `.env` (see [Setup](#setup))
4. DO NOT try manual fixes — report error, let ft-deploy.mjs handle it
