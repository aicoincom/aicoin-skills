#!/usr/bin/env node
// AiCoin Airdrop (OpenData) CLI
import { apiGet, cli } from '../lib/aicoin-api.mjs';

cli({
  // 综合查询：同时查 airdrop(交易所空投) + drop_radar(链上早期项目)，一次调用返回全部数据
  all: async ({ page_size, status, keyword, lan } = {}) => {
    const ps = page_size || '20';
    const [airdrop, radar] = await Promise.all([
      apiGet('/api/upgrade/v2/content/airdrop/list', { source: 'all', page_size: ps, ...(lan ? { lan } : {}) }).catch(e => ({ error: e.message, list: [] })),
      apiGet('/api/upgrade/v2/content/drop-radar/list', { page_size: ps, ...(status ? { status } : {}), ...(keyword ? { keyword } : {}), ...(lan ? { lan } : {}) }).catch(e => ({ error: e.message, list: [] })),
    ]);
    return {
      交易所空投: { count: airdrop.data?.count || 0, list: airdrop.data?.list || [] },
      链上早期项目: { count: radar.data?.count || 0, list: radar.data?.list || [] },
    };
  },
  list: ({ source, status, page, page_size, exchange, activity_type, lan } = {}) => {
    const p = {};
    if (source) p.source = source;
    if (status) p.status = status;
    if (page) p.page = page;
    if (page_size) p.page_size = page_size;
    if (exchange) p.exchange = exchange;
    if (activity_type) p.activity_type = activity_type;
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/airdrop/list', p);
  },
  detail: ({ type, token, lan } = {}) => {
    const p = { type, token };
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/airdrop/detail', p);
  },
  banner: ({ limit, lan } = {}) => {
    const p = {};
    if (limit) p.limit = limit;
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/airdrop/banner', p);
  },
  exchanges: ({ lan } = {}) => {
    const p = {};
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/airdrop/exchanges', p);
  },
  calendar: ({ year, month, lan } = {}) => {
    const p = { year, month };
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/airdrop/calendar', p);
  },
});
