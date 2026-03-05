# CoinOS Skills

4 个 AI Skill 封装 [AiCoin Open API](https://www.aicoin.com/opendata) — 实时加密货币行情、交易所交易、Freqtrade 量化策略、Hyperliquid 鲸鱼分析。

支持 **Claude Code、Cursor、Codex、OpenClaw、Windsurf、Gemini CLI** 等 AI 编程工具。

## 安装

```bash
npx skills add aicoincom/coinos-skills
```

选择要安装的 skill，或用 `--yes` 全部安装。

## Skills

| Skill                  | 功能                                          | 脚本                                             |
| ---------------------- | --------------------------------------------- | ------------------------------------------------ |
| **aicoin-market**      | 行情、K线、资金费率、持仓量、大单、新闻、信号 | coin, market, features, news, twitter, newsflash |
| **aicoin-trading**     | 交易所交易（Binance/OKX/Bybit/...）、自动交易 | exchange, auto-trade                             |
| **aicoin-freqtrade**   | 策略创建、回测、机器人部署                    | ft-deploy, ft, ft-dev                            |
| **aicoin-hyperliquid** | Hyperliquid 鲸鱼追踪、清算、交易员分析        | hl-market, hl-trader                             |

## 快速开始

不需要 API Key — 内置免费 Key 开箱即用。

```bash
# 直接问你的 AI
"BTC 现在多少钱？"
"给我看一下 ETH 的 1 小时 K 线"
"帮我写一个资金费率策略"
"查一下 OKX 余额"
"Hyperliquid 上 BTC 大户都在做什么方向？"
```

也可以直接运行脚本：

```bash
# 查价
node skills/aicoin-market/scripts/coin.mjs coin_ticker '{"coin_list":"bitcoin"}'

# K线
node skills/aicoin-market/scripts/market.mjs kline '{"symbol":"btcusdt:okex","period":"3600","size":"100"}'

# 余额
node skills/aicoin-trading/scripts/exchange.mjs balance '{"exchange":"okx"}'

# 创建策略（永远不要手写 Python —— 用这个）
node skills/aicoin-freqtrade/scripts/ft-deploy.mjs create_strategy '{"name":"MyStrat","timeframe":"15m","aicoin_data":["funding_rate"]}'

# 回测
node skills/aicoin-freqtrade/scripts/ft-deploy.mjs backtest '{"strategy":"MyStrat","timerange":"20250101-20260301"}'

# Hyperliquid 行情
node skills/aicoin-hyperliquid/scripts/hl-market.mjs ticker '{"coin":"BTC"}'
```

## 环境变量

创建 `.env` 文件（脚本自动加载，依次查找当前目录、`~/.openclaw/workspace/.env`、`~/.openclaw/.env`）：

```bash
# AiCoin API（可选 — 内置免费 Key，有 IP 频率限制）
AICOIN_ACCESS_KEY_ID="your-key"
AICOIN_ACCESS_SECRET="your-secret"

# 交易所交易（按需配置）
BINANCE_API_KEY="xxx"
BINANCE_API_SECRET="xxx"
# 支持: BINANCE, OKX, BYBIT, BITGET, GATE, HTX, KUCOIN, MEXC, COINBASE
# OKX 还需要: OKX_PASSWORD="xxx"

# 代理（可选）
PROXY_URL="socks5://127.0.0.1:7890"
```

## License

MIT
