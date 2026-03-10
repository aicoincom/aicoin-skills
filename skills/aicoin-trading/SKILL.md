---
name: aicoin-trading
description: "下单交易工具。严格规则：(1) 所有订单必须通过 node scripts/exchange.mjs create_order 执行，禁止写自定义代码下单 (2) create_order 分两步：第一次返回预览，展示给用户等确认，用户说确认后第二次加 confirmed=true 执行 (3) 禁止自动确认，禁止跳过预览。Trigger: 'buy', 'sell', 'order', 'long', 'short', 'leverage', '买', '卖', '下单', '做多', '做空', '杠杆', '开仓', '平仓'."
metadata: { "openclaw": { "primaryEnv": "AICOIN_ACCESS_KEY_ID", "requires": { "bins": ["node"] }, "homepage": "https://www.aicoin.com/opendata", "source": "https://github.com/aicoincom/coinos-skills", "license": "MIT" } }
---

> **⚠️ 运行脚本: 所有 `node scripts/...` 命令必须以本 SKILL.md 所在目录为 workdir。**

# AiCoin Trading — 下单专用

## ⛔ 铁律（违反任何一条都是严重错误）

1. **禁止写代码下单。** 不准写 `import ccxt`、`new ccxt.okx()`、`fetch("https://...")` 或任何自定义代码来下单。所有订单只能通过 `node scripts/exchange.mjs create_order` 执行。
2. **禁止自动确认。** `create_order` 第一次调用返回预览（含风险提示），你必须把预览完整展示给用户，等用户回复"确认"或"yes"后，才能第二次调用加 `"confirmed":"true"` 执行。
3. **禁止修改用户参数。** 余额不够就告诉用户，不准自动调整数量或杠杆。
4. **禁止主动平仓。** 除非用户明确要求。

## 下单流程（两步，不可跳过）

```
步骤1: node scripts/exchange.mjs create_order '{"exchange":"okx","symbol":"BTC/USDT:USDT","type":"market","side":"buy","amount":1,"market_type":"swap"}'
→ 返回预览（交易对、方向、数量、价格、杠杆、保证金、风险提示）
→ 你必须把所有字段展示给用户

步骤2: 用户确认后
node scripts/exchange.mjs create_order '{"exchange":"okx","symbol":"BTC/USDT:USDT","type":"market","side":"buy","amount":1,"market_type":"swap","confirmed":"true"}'
→ 实际下单
```

## 下单前准备

| 步骤 | 命令 |
|------|------|
| 设置杠杆+保证金模式 | `node scripts/exchange.mjs set_trading_params '{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":10,"margin_mode":"isolated","market_type":"swap"}'` |
| 查合约信息 | `node scripts/exchange.mjs markets '{"exchange":"okx","market_type":"swap","base":"BTC"}'` |

## 其他命令

| 操作 | 命令 |
|------|------|
| 取消订单 | `node scripts/exchange.mjs cancel_order '{"exchange":"okx","symbol":"BTC/USDT","order_id":"xxx"}'` |
| 单独设杠杆 | `node scripts/exchange.mjs set_leverage '{"exchange":"okx","symbol":"BTC/USDT:USDT","leverage":10,"market_type":"swap"}'` |

## 数量

**合约自动换算：** amount 传用户说的币数量（如 0.01），脚本自动转张数。传整数则视为张数。
**现货：** amount = 币数量。

**格式：** 现货 `BTC/USDT`，合约 `BTC/USDT:USDT`，Hyperliquid 用 USDC: `BTC/USDC:USDC`。

**交易所：** Binance, OKX, Bybit, Bitget, Gate.io, HTX, Pionex, Hyperliquid。
