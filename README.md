<div align="center">

<pre>
 ██████╗ ██████╗ ██╗███╗   ██╗ ██████╗ ███████╗
██╔════╝██╔═══██╗██║████╗  ██║██╔═══██╗██╔════╝
██║     ██║   ██║██║██╔██╗ ██║██║   ██║███████╗
██║     ██║   ██║██║██║╚██╗██║██║   ██║╚════██║
╚██████╗╚██████╔╝██║██║ ╚████║╚██████╔╝███████║
 ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝
</pre>

### `> Crypto market data, trading & quant automation for AI agents_`

<br />

[![Version](https://img.shields.io/badge/v2.0.0-blueviolet?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/aicoincom/coinos-skills/releases)
[![JavaScript](https://img.shields.io/badge/ESM-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://nodejs.org/)
[![AiCoin API](https://img.shields.io/badge/AiCoin_API-00d4aa?style=for-the-badge&logo=bitcoin&logoColor=white)](https://www.aicoin.com/opendata)
[![License](https://img.shields.io/badge/MIT-License-f59e0b?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](./LICENSE)
[![Skills](https://img.shields.io/badge/Skills-5_included-ff6b6b?style=for-the-badge&logo=openai&logoColor=white)](./skills/)

<br />

[English](./README.md) · [简体中文](./README-CN.md)

<br />

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

</div>

<div align="center">

## What is CoinOS?

**One sentence to query. One sentence to trade. One sentence to backtest.**

</div>

<div align="center">

CoinOS is a collection of AI skills wrapping [AiCoin Open API](https://www.aicoin.com/opendata) — bringing real-time crypto market data, exchange trading, Freqtrade strategy automation, and Hyperliquid whale analytics to any AI agent.

Works with **Claude Code, Cursor, Codex, OpenClaw, Windsurf, Gemini CLI** and more.

</div>

<div align="center">

<table>
<tr><td>

- No API key needed — **built-in free key** works out of the box
- All data from **AiCoin**, the leading crypto analytics platform
- **5 skills**, each self-contained and independently installable

</td></tr>
</table>

<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Skill Matrix

</div>

<div align="center">
<table>
<tr>
<td width="50%">

**Market Intelligence**

| Skill | Capability |
|:--|:--|
| **aicoin-market** | Prices, K-lines, funding rates, OI, whale orders, news, signals, airdrops, drop radar |

</td>
<td width="50%">

**Exchange Trading**

| Skill | Capability |
|:--|:--|
| **aicoin-trading** | Buy/sell across Binance, OKX, Bybit & 6 more exchanges, automated trading strategies |

</td>
</tr>
<tr>
<td width="50%">

**Quant Automation**

| Skill | Capability |
|:--|:--|
| **aicoin-freqtrade** | Strategy creation with AiCoin indicators, backtesting, hyperopt, live bot deployment |

</td>
<td width="50%">

**Whale Analytics**

| Skill | Capability |
|:--|:--|
| **aicoin-hyperliquid** | Whale position tracking, liquidation data, trader PnL analytics on Hyperliquid |

</td>
</tr>
<tr>
<td colspan="2">

**Account Management**

| Skill | Capability |
|:--|:--|
| **aicoin-account** | Balance & positions, order history, API key management, exchange registration with referral links |

</td>
</tr>
</table>
</div>

<div align="center">
<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Architecture

</div>

```
                         ┌─────────────────────┐
                         │   AI Agent (NL)      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │    CoinOS Skills      │
                         └──────────┬───────────┘
                                    │
          ┌─────────────┬───────────┼───────────┬─────────────┐
          │             │           │           │             │
   ┌──────▼──────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌─────▼─────┐
   │   market    │ │ trading │ │freqtrade│ │  hyper  │ │  account  │
   │             │ │         │ │         │ │ liquid  │ │           │
   │ coin.mjs    │ │exchange │ │ft-deploy│ │hl-market│ │account.mjs│
   │ market.mjs  │ │  .mjs   │ │  .mjs   │ │  .mjs   │ │           │
   │ news.mjs    │ │auto-    │ │ ft.mjs  │ │hl-trader│ │           │
   │ features.mjs│ │trade.mjs│ │ft-dev   │ │  .mjs   │ │           │
   │ twitter.mjs │ │         │ │  .mjs   │ │         │ │           │
   │newsflash.mjs│ │         │ │         │ │         │ │           │
   └──────┬──────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘
          │             │           │           │             │
          └─────────────┴───────┬───┴───────────┘             │
                                │                             │
                     ┌──────────▼───────────┐      ┌──────────▼──────────┐
                     │   AiCoin Open API    │      │   Exchange APIs     │
                     │  (market data layer) │      │ Binance/OKX/Bybit.. │
                     └──────────────────────┘      └─────────────────────┘
```

<div align="center">

Each skill is **self-contained** with its own `SKILL.md`, `lib/`, and `scripts/`. All scripts share a common `aicoin-api.mjs` client library.

<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Quick Start

</div>

```bash
# Install via npx
npx skills add aicoincom/coinos-skills

# Select which skills to install, or use --yes to install all 5
```

<div align="center">

Then, just talk to your AI agent:

</div>

```
> "BTC 现在多少钱？"
> "给我看一下 ETH 的 1 小时 K 线"
> "帮我写一个资金费率策略"
> "查一下 OKX 余额"
> "Hyperliquid 上 BTC 大户都在做什么方向？"
```

<div align="center">

No configuration needed. A built-in free API key works out of the box.

<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Supported Exchanges

| Exchange | ID | Spot | Futures | |
|:--|:--|:--:|:--:|:--|
| **Binance** | `binance` | ✅ | ✅ | World's largest by volume |
| **OKX** | `okx` | ✅ | ✅ | Advanced derivatives platform |
| **Bybit** | `bybit` | ✅ | ✅ | Leading perpetuals exchange |
| **Bitget** | `bitget` | ✅ | ✅ | Copy-trading leader |
| **Gate.io** | `gate` | ✅ | ✅ | 1700+ trading pairs |
| **HTX** | `htx` | ✅ | ✅ | Global digital asset platform |
| **KuCoin** | `kucoin` | ✅ | ✅ | The people's exchange |
| **MEXC** | `mexc` | ✅ | ✅ | Fast listing exchange |
| **Coinbase** | `coinbase` | ✅ | — | Regulated US exchange |

<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Usage Examples

</div>

<details open>
<summary><strong>Market Data</strong></summary>

```
You:     BTC 现在多少钱？

CoinOS:  BTC/USDT — $84,302.50
         24h Change:  +2.34%
         24h High:    $85,100.00
         24h Low:     $82,450.00
         24h Volume:  $28.5B
```

</details>

<details>
<summary><strong>K-line & Technical Analysis</strong></summary>

```
You:     Show me ETH 1h K-line.

CoinOS:  Fetches 100 candles from OKX, returns OHLCV data
         with timestamps, ready for charting or analysis.
```

```bash
# Direct script call
node skills/aicoin-market/scripts/market.mjs kline \
  '{"symbol":"ethusdt:okex","period":"3600","size":"100"}'
```

</details>

<details>
<summary><strong>Exchange Trading</strong></summary>

```
You:     帮我在 Binance 买入 0.1 个 BTC

CoinOS:  Order Preview
         ─────────────────────────────────────
         Exchange:    Binance
         Pair:        BTC/USDT
         Side:        BUY
         Type:        Market
         Amount:      0.1 BTC
         Est. Cost:   ~$8,430.25
         ─────────────────────────────────────
         Confirm to execute.
```

</details>

<details>
<summary><strong>Strategy & Backtesting</strong></summary>

```
You:     帮我写一个资金费率策略，15分钟周期

CoinOS:  Creating strategy via ft-deploy.mjs...
         ✓ Strategy "FundingRateStrat" created
         ✓ Timeframe: 15m
         ✓ AiCoin data: funding_rate
         ✓ File: user_data/strategies/FundingRateStrat.py

You:     回测一下，2025年全年

CoinOS:  Running backtest...
         ─────────────────────────────────────
         Strategy:    FundingRateStrat
         Timerange:   2025-01-01 → 2025-12-31
         Total trades: 142
         Win rate:     63.4%
         Total profit: +18.7%
         Max drawdown: -8.2%
         Sharpe ratio: 1.45
```

</details>

<details>
<summary><strong>Hyperliquid Whale Tracking</strong></summary>

```
You:     Hyperliquid 上 BTC 大户都在做什么方向？

CoinOS:  Top BTC Whale Positions (Hyperliquid)
         ─────────────────────────────────────
         🐋 0x1a2b...  LONG   $12.5M   +$340K PnL
         🐋 0x3c4d...  SHORT  $8.2M    -$120K PnL
         🐋 0x5e6f...  LONG   $6.8M    +$89K  PnL
         ─────────────────────────────────────
         Net bias: 65% LONG
```

</details>

<div align="center">
<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

## Environment Variables

</div>

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

<div align="center">
<br />
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />
</div>

<details>
<summary><strong>Project Structure</strong></summary>

<br />

```
coinos-skills/
├── skills/
│   ├── aicoin-market/        # Prices, K-lines, news, signals
│   │   ├── SKILL.md
│   │   ├── lib/
│   │   └── scripts/
│   │       ├── coin.mjs          Prices, tickers, coin info
│   │       ├── market.mjs        K-lines, funding rates, OI
│   │       ├── features.mjs      Whale orders, large trades
│   │       ├── news.mjs          News feed, search
│   │       ├── twitter.mjs       Crypto Twitter/X feed
│   │       └── newsflash.mjs     Breaking news alerts
│   │
│   ├── aicoin-trading/       # Exchange trading
│   │   ├── SKILL.md
│   │   ├── lib/
│   │   └── scripts/
│   │       ├── exchange.mjs      Orders, balance, positions
│   │       └── auto-trade.mjs    Automated trading strategies
│   │
│   ├── aicoin-freqtrade/     # Strategy automation
│   │   ├── SKILL.md
│   │   ├── lib/
│   │   └── scripts/
│   │       ├── ft-deploy.mjs     Create, backtest, deploy bots
│   │       ├── ft.mjs            Freqtrade CLI wrapper
│   │       └── ft-dev.mjs        Strategy development helpers
│   │
│   ├── aicoin-hyperliquid/   # Whale analytics
│   │   ├── SKILL.md
│   │   ├── lib/
│   │   └── scripts/
│   │       ├── hl-market.mjs     Tickers, orderbook, trades
│   │       └── hl-trader.mjs     Whale positions, PnL, leaderboard
│   │
│   └── aicoin-account/       # Account management
│       ├── SKILL.md
│       └── scripts/
│           └── account.mjs       Balance, positions, API keys
│
├── AGENTS.md                 # Skill routing for AI agents
├── CLAUDE.md                 # Dev instructions
└── .claude-plugin/
    └── plugin.json           # Plugin metadata
```

</details>

<div align="center">

<br />

## License

[MIT License](./LICENSE)

<br />

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----" />

<br />

**Powered by** [AiCoin Open API](https://www.aicoin.com/opendata) · [CCXT](https://github.com/ccxt/ccxt) · [Freqtrade](https://github.com/freqtrade/freqtrade)

<br />

```
Built for AI-native crypto trading.
```

<br />

<sub>Made by <a href="https://www.aicoin.com">AiCoin</a></sub>

</div>
