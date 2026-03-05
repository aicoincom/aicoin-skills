# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

This is a **Claude Code plugin** — a collection of CoinOS skills for crypto market data, trading, strategy automation, and whale analytics, powered by AiCoin Open API.

## Architecture

```
aicoin-skills/
├── skills/              # 4 focused aicoin-* skills (v2.0)
│   ├── aicoin-market/   # Prices, K-lines, news, signals
│   ├── aicoin-trading/  # Exchange trading, auto-trade
│   ├── aicoin-freqtrade/# Strategy creation, backtest, deploy
│   └── aicoin-hyperliquid/ # HL whale tracking, analytics
├── aicoin/              # Legacy monolithic skill (backwards compat)
├── AGENTS.md            # Skill overview for agents
└── .claude-plugin/      # Plugin metadata
```

Each skill is self-contained with its own `SKILL.md`, `lib/`, and `scripts/`. Scripts use `../lib/aicoin-api.mjs` import path.

## Available Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| aicoin-market | Prices, K-lines, news, signals | Crypto prices, charts, funding rates, news |
| aicoin-trading | Exchange trading, auto-trade | Buy/sell, balance, positions, auto-trade |
| aicoin-freqtrade | Strategy, backtest, deploy | Write strategies, backtest, deploy bots |
| aicoin-hyperliquid | HL whale tracking | Hyperliquid whales, liquidations, OI |
