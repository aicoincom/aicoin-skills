# AiCoin Skill for OpenClaw

一个 Skill 封装 [AiCoin Open API](https://www.aicoin.com/opendata) — 实时加密货币行情、链上分析、交易所交易、机器人管理，40+ 工具。

## 安装

```bash
clawhub install aicoin
```

或从 GitHub 安装：

```bash
npx skills add aicoincom/aicoin-skills
```

## 包含内容

| 脚本 | 说明 | 工具数 |
|------|------|--------|
| `coin.mjs` | 币种价格、AI 分析、资金费率、清算、持仓量 | 12 |
| `market.mjs` | K线、指标、指数、加密概念股、机构持仓、盘口深度 | 18 |
| `news.mjs` | 新闻快讯、行业动态、上币公告 | 6 |
| `features.mjs` | 多空比、大单追踪、策略信号 | 16 |
| `hl-market.mjs` | HL 行情、鲸鱼、清算、持仓量、Taker 资金流 | 15 |
| `hl-trader.mjs` | HL 交易员分析、成交、订单、仓位、组合 | 15 |
| `exchange.mjs` | CCXT 交易所交易（Binance、OKX、Bybit 等） | 14 |
| `ft.mjs` | Freqtrade 机器人控制与监控 | 24 |
| `ft-dev.mjs` | 回测、策略管理、交易对列表 | 14 |

## 环境变量

```bash
# AiCoin API（可选 — 内置免费 Key，有 IP 频率限制）
AICOIN_ACCESS_KEY_ID="your-key"
AICOIN_ACCESS_SECRET="your-secret"

# 交易所交易（CCXT）
BINANCE_API_KEY="xxx"
BINANCE_API_SECRET="xxx"

# Freqtrade 机器人
FREQTRADE_URL="http://localhost:8080"
FREQTRADE_USERNAME="freqtrader"
FREQTRADE_PASSWORD="xxx"
```

## 用法

Agent 会自动调用脚本，也可以直接运行：

```bash
node aicoin/scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin,ethereum"}'
node aicoin/scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'
```

完整 action 参考见 [SKILL.md](aicoin/SKILL.md)。

## License

MIT
