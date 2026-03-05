# CoinOS Skills

4 AI skills wrapping [AiCoin Open API](https://www.aicoin.com/opendata) — real-time crypto market data, exchange trading, Freqtrade strategy automation, and Hyperliquid whale analytics.

Works with **Claude Code, Cursor, Codex, OpenClaw, Windsurf, Gemini CLI** and more.

## Installation

```bash
npx skills add aicoincom/coinos-skills
```

Select which skills to install, or use `--yes` to install all 4.

## Skills

| Skill                  | What it does                                                    | Scripts                                          |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| **aicoin-market**      | Prices, K-lines, funding rates, OI, whale orders, news, signals | coin, market, features, news, twitter, newsflash |
| **aicoin-trading**     | Exchange trading (Binance/OKX/Bybit/...), automated trading     | exchange, auto-trade                             |
| **aicoin-freqtrade**   | Strategy creation, backtesting, bot deployment                  | ft-deploy, ft, ft-dev                            |
| **aicoin-hyperliquid** | Hyperliquid whale tracking, liquidations, trader analytics      | hl-market, hl-trader                             |

## Quick Start

No API key needed — a built-in free key works out of the box.

```bash
# Ask your AI agent
"BTC 现在多少钱？"
"给我看一下 ETH 的 1 小时 K 线"
"帮我写一个资金费率策略"
"查一下 OKX 余额"
"Hyperliquid 上 BTC 大户都在做什么方向？"
```

Or run scripts directly:

```bash
# Price
node skills/aicoin-market/scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'

# K-line
node skills/aicoin-market/scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'

# Balance
node skills/aicoin-trading/scripts/exchange.mjs balance '{"exchange":"okx"}'

# Create strategy (NEVER hand-write Python — always use this)
node skills/aicoin-freqtrade/scripts/ft-deploy.mjs create_strategy '{"name":"MyStrat","timeframe":"15m","aicoin_data":["funding_rate"]}'

# Backtest
node skills/aicoin-freqtrade/scripts/ft-deploy.mjs backtest '{"strategy":"MyStrat","timerange":"20250101-20260301"}'

# Hyperliquid ticker
node skills/aicoin-hyperliquid/scripts/hl-market.mjs ticker '{"coin":"BTC"}'
```

## Environment Variables

Create a `.env` file (scripts auto-load from cwd, `~/.openclaw/workspace/.env`, or `~/.openclaw/.env`):

```bash
# AiCoin API (optional — built-in free key works with IP rate limits)
AICOIN_ACCESS_KEY_ID="your-key"
AICOIN_ACCESS_SECRET="your-secret"

# Exchange trading (only if needed)
BINANCE_API_KEY="xxx"
BINANCE_API_SECRET="xxx"
# Supported: BINANCE, OKX, BYBIT, BITGET, GATE, HTX, KUCOIN, MEXC, COINBASE
# OKX also needs: OKX_PASSWORD="xxx"

# Proxy (optional)
PROXY_URL="socks5://127.0.0.1:7890"
```

## License

MIT
