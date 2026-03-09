#!/usr/bin/env node
/**
 * check-tier.mjs — Check current AiCoin API key tier and guide upgrade
 *
 * Usage:
 *   node scripts/check-tier.mjs              # Check current tier
 *   node scripts/check-tier.mjs verify       # Verify after upgrade
 */
import { apiGet } from '../lib/aicoin-api.mjs';

// vip_type → Chinese tier name mapping
const VIP_TYPE_MAP = {
  basic: '基础版',
  normal: '标准版',
  premium: '高级版',
  professional: '专业版',
};

const TIER_ORDER = ['免费版', '基础版', '标准版', '高级版', '专业版'];

const TIER_PRICES = {
  '免费版': '$0',
  '基础版': '$29/月',
  '标准版': '$79/月',
  '高级版': '$299/月',
  '专业版': '$699/月',
};

const TIER_FEATURES = {
  '基础版': '资金费率、多空比、新闻',
  '标准版': '大单数据、聚合成交、信号',
  '高级版': '清算地图、指标K线',
  '专业版': '全部功能：AI分析、OI、美股',
};

const TIER_TESTS = [
  { tier: '免费版',   endpoint: '/api/v2/coin/ticker', params: { coin_list: 'bitcoin' }, label: '行情数据' },
  { tier: '基础版',   endpoint: '/api/v2/mix/ls-ratio', params: {}, label: '多空比' },
  { tier: '标准版',   endpoint: '/api/v2/order/bigOrder', params: { symbol: 'btcswapusdt:binance' }, label: '大单数据' },
  { tier: '高级版',   endpoint: '/api/upgrade/v2/futures/liquidation/map', params: { symbol: 'btcswapusdt:binance', cycle: '24h' }, label: '清算地图' },
  { tier: '专业版',   endpoint: '/api/upgrade/v2/futures/trade-data', params: { dbkey: 'btcswapusdt:binance' }, label: 'OI持仓量' },
];

async function getKeyInfo() {
  try {
    const data = await apiGet('/api/v2/api-key-info');
    if (data.success !== false && data.data) {
      return data.data;
    }
  } catch {}
  return null;
}

async function checkTier() {
  // Step 1: Try to get tier from api-key-info (fast & accurate)
  const keyInfo = await getKeyInfo();
  let currentTier = '免费版';
  let endTime = null;

  if (keyInfo) {
    const vipType = keyInfo.vip_type;
    if (vipType && VIP_TYPE_MAP[vipType]) {
      currentTier = VIP_TYPE_MAP[vipType];
    }
    if (keyInfo.end_time) {
      // Convert timestamp or date string to human-readable
      const ts = typeof keyInfo.end_time === 'number' ? keyInfo.end_time * 1000 : new Date(keyInfo.end_time).getTime();
      if (!isNaN(ts)) {
        endTime = new Date(ts).toISOString().split('T')[0];
      }
    }
  }

  // Step 2: Endpoint tests as verification
  const results = [];
  for (const test of TIER_TESTS) {
    try {
      const data = await apiGet(test.endpoint, test.params);
      if (data.success === false && (data.errorCode === 304 || data.errorCode === 403)) {
        results.push({ 套餐: test.tier, 功能: test.label, 状态: '❌ 需升级' });
      } else {
        results.push({ 套餐: test.tier, 功能: test.label, 状态: '✅ 可用' });
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('403') || msg.includes('304')) {
        results.push({ 套餐: test.tier, 功能: test.label, 状态: '❌ 需升级' });
      } else {
        results.push({ 套餐: test.tier, 功能: test.label, 状态: '⚠️ 网络错误' });
      }
    }
  }

  // Fallback: if api-key-info didn't return a tier, infer from endpoint tests
  // Use sequential logic: tier = highest where ALL previous tiers also pass
  if (!keyInfo || !keyInfo.vip_type) {
    let inferred = '免费版';
    for (const test of TIER_TESTS) {
      const r = results.find(r => r.套餐 === test.tier);
      if (r && r.状态 === '✅ 可用') {
        inferred = test.tier;
      } else {
        break;
      }
    }
    currentTier = inferred;
  }

  // Build output
  const tierIndex = TIER_ORDER.indexOf(currentTier);
  const nextTier = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : null;

  const output = {
    当前套餐: currentTier,
    ...(endTime ? { 到期时间: endTime } : {}),
    功能检测: results,
  };

  if (nextTier) {
    output.升级建议 = {
      下一级: `${nextTier} (${TIER_PRICES[nextTier]})`,
      新增功能: TIER_FEATURES[nextTier],
      升级链接: 'https://www.aicoin.com/opendata',
      操作步骤: [
        '1. 打开 https://www.aicoin.com/opendata',
        '2. 登录账号，选择目标套餐并付款',
        '3. 到「API管理」页面查看 Key（升级后原Key自动生效，无需更换）',
        '4. 如果是新Key，更新 .env 中的 AICOIN_ACCESS_KEY_ID 和 AICOIN_ACCESS_SECRET',
        '5. 运行 node scripts/check-tier.mjs verify 验证升级成功'
      ]
    };
  } else {
    output.状态 = '🎉 已是最高套餐专业版，所有功能可用！';
  }

  output.安全提示 = 'AiCoin API Key 仅用于获取市场数据，无法交易。密钥仅保存在本地。';

  return output;
}

const action = process.argv[2] || 'check';
const result = await checkTier();

if (action === 'verify') {
  result.验证模式 = true;
  result.说明 = '升级后请确认上方功能检测中对应功能显示 ✅';
}

console.log(JSON.stringify(result, null, 2));
