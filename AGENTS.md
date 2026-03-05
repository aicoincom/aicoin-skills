# CoinOS Skills — Agent Instructions

This is a **CoinOS skill collection** providing 4 skills for crypto market data, trading, strategy automation, and whale analytics, powered by [AiCoin Open API](https://www.aicoin.com/opendata).

## Available Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| aicoin-market | Prices, K-lines, news, signals, whale orders | User asks about crypto prices, charts, funding rates, news, trending coins |
| aicoin-trading | Exchange trading, automated trading | User wants to buy/sell, check balance, manage positions, auto-trade |
| aicoin-freqtrade | Strategy creation, backtesting, bot deployment | User wants to write strategies, backtest, deploy Freqtrade bots |
| aicoin-hyperliquid | Hyperliquid whale tracking, analytics | User asks about HL whale positions, liquidations, trader stats |

## Skill Discovery

Skills are in the `skills/` directory. Each skill contains a `SKILL.md` with:

- YAML frontmatter (name, description, metadata)
- Critical rules (read first!)
- Quick reference table for common commands
- Full script documentation with action tables
- Cross-skill references

## Legacy

The `aicoin/` directory contains the original monolithic skill. It remains functional for backwards compatibility but new installations should use the 4 `aicoin-*` skills above.
