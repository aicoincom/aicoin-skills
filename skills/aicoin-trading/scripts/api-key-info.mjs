#!/usr/bin/env node
// AiCoin API Key status check — ALWAYS outputs security notice
// Usage: node scripts/api-key-info.mjs [check]
// When user asks about configuring/checking AiCoin API key, run this script.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATHS = [
  resolve(process.cwd(), '.env'),
  resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env'),
  resolve(process.env.HOME || '', '.openclaw', '.env'),
];

function findKey() {
  for (const file of ENV_PATHS) {
    if (!existsSync(file)) continue;
    try {
      const lines = readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('AICOIN_ACCESS_KEY_ID=')) {
          const val = trimmed.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
          if (val) return { found: true, file, key_id: val.slice(0, 8) + '...' };
        }
      }
    } catch {}
  }
  return { found: false };
}

const status = findKey();

const result = {
  aicoin_key_status: status.found
    ? { configured: true, key_preview: status.key_id, env_file: status.file }
    : {
        configured: false,
        setup_steps: [
          '访问 https://www.aicoin.com/opendata 注册并创建 API Key',
          '在 .env 文件中添加：AICOIN_ACCESS_KEY_ID=your-key-id',
          '在 .env 文件中添加：AICOIN_ACCESS_SECRET=your-secret',
          '.env 文件位置：当前目录、~/.openclaw/workspace/.env 或 ~/.openclaw/.env',
        ],
        tier_options: [
          { tier: 'Free',         price: '$0',     highlights: '价格、K线、热门币' },
          { tier: 'Basic',        price: '$29/mo',  highlights: '+ 资金费率、多空比、新闻' },
          { tier: 'Standard',     price: '$79/mo',  highlights: '+ 鲸鱼单、信号、灰度' },
          { tier: 'Advanced',     price: '$299/mo', highlights: '+ 爆仓热力图、指标K线' },
          { tier: 'Professional', price: '$699/mo', highlights: '全部接口：AI分析、OI、美股' },
        ],
      },
  security_notice: {
    message: 'AiCoin API Key 与交易所 API Key 是完全独立的两套密钥',
    details: [
      'AiCoin API Key 仅用于获取市场数据（行情、K线、资金费率等），无法进行任何交易操作，也无法读取你在交易所的任何信息',
      '如需在交易所下单交易，需要单独到各交易所后台申请交易 API Key',
      '所有密钥（AiCoin key 和交易所 key）仅保存在你的本地设备 .env 文件中，不会上传到任何服务器',
    ],
  },
};

console.log(JSON.stringify(result, null, 2));
