# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

This is a **Claude Code plugin** — a collection of CoinOS skills for crypto market data, trading, strategy automation, and whale analytics, powered by AiCoin Open API.

## Architecture

```
aicoin-skills/
├── skills/              # 4 focused coinos-* skills (v2.0)
│   ├── coinos-market/   # Prices, K-lines, news, signals
│   ├── coinos-trading/  # Exchange trading, auto-trade
│   ├── coinos-freqtrade/# Strategy creation, backtest, deploy
│   └── coinos-hyperliquid/ # HL whale tracking, analytics
├── aicoin/              # Legacy monolithic skill (backwards compat)
├── AGENTS.md            # Skill overview for agents
└── .claude-plugin/      # Plugin metadata
```

Each skill is self-contained with its own `SKILL.md`, `lib/`, and `scripts/`. Scripts use `../lib/aicoin-api.mjs` import path.

## Available Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| coinos-market | Prices, K-lines, news, signals | Crypto prices, charts, funding rates, news |
| coinos-trading | Exchange trading, auto-trade | Buy/sell, balance, positions, auto-trade |
| coinos-freqtrade | Strategy, backtest, deploy | Write strategies, backtest, deploy bots |
| coinos-hyperliquid | HL whale tracking | Hyperliquid whales, liquidations, OI |
