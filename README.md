# AiCoin Skill for OpenClaw

One skill wrapping [AiCoin Open API](https://www.aicoin.com/opendata) — real-time crypto market data, on-chain analytics, exchange trading, and bot management. 40+ tools.

## Installation

```bash
clawhub install aicoin
```

Or via GitHub:

```bash
npx skills add aicoincom/aicoin-skills
```

## What's Included

| Script | Description | Tools |
|--------|-------------|-------|
| `coin.mjs` | Coin prices, AI analysis, funding rates, liquidation, open interest | 12 |
| `market.mjs` | K-lines, indicators, indexes, crypto stocks, treasury, depth | 18 |
| `news.mjs` | News articles, flash updates, exchange listings | 6 |
| `features.mjs` | Long/short ratio, whale orders, trading signals | 16 |
| `hl-market.mjs` | Hyperliquid tickers, whales, liquidations, OI, taker flow | 15 |
| `hl-trader.mjs` | HL trader analytics, fills, orders, positions, portfolio | 15 |
| `exchange.mjs` | CCXT exchange trading (Binance, OKX, Bybit, etc.) | 14 |
| `ft.mjs` | Freqtrade bot control and monitoring | 24 |
| `ft-dev.mjs` | Backtesting, strategy management, pair lists | 14 |

## Environment Variables

```bash
# AiCoin API (optional — built-in free key available with IP rate limits)
AICOIN_ACCESS_KEY_ID="your-key"
AICOIN_ACCESS_SECRET="your-secret"

# Exchange trading (CCXT)
BINANCE_API_KEY="xxx"
BINANCE_API_SECRET="xxx"

# Freqtrade bot
FREQTRADE_URL="http://localhost:8080"
FREQTRADE_USERNAME="freqtrader"
FREQTRADE_PASSWORD="xxx"
```

## Usage

The agent runs scripts automatically. You can also call them directly:

```bash
node aicoin/scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin,ethereum"}'
node aicoin/scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'
```

See [SKILL.md](aicoin/SKILL.md) for the full action reference.

## License

MIT
