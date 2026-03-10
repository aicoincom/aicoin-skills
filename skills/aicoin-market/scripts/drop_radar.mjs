#!/usr/bin/env node
// AiCoin Drop Radar (OpenData) CLI
import { apiGet, cli } from '../lib/aicoin-api.mjs';

cli({
  list: ({ page, page_size, status, activity_type, reward_type, min_total_raise, max_total_raise, created_at, keyword, board_keys, eco_keys, sort_by, sort_order, lan } = {}) => {
    const p = {};
    if (page) p.page = page;
    if (page_size) p.page_size = page_size;
    if (status) p.status = status;
    if (activity_type) p.activity_type = activity_type;
    if (reward_type) p.reward_type = reward_type;
    if (min_total_raise) p.min_total_raise = min_total_raise;
    if (max_total_raise) p.max_total_raise = max_total_raise;
    if (created_at) p.created_at = created_at;
    if (keyword) p.keyword = keyword;
    if (board_keys) p.board_keys = board_keys;
    if (eco_keys) p.eco_keys = eco_keys;
    if (sort_by) p.sort_by = sort_by;
    if (sort_order) p.sort_order = sort_order;
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/drop-radar/list', p);
  },
  detail: async ({ airdrop_id, lan } = {}) => {
    if (!airdrop_id) return { error: 'airdrop_id is required. Use "list" action first to find valid IDs.' };
    const p = { airdrop_id };
    if (lan) p.lan = lan;
    const [detail, team, xFollowing] = await Promise.all([
      apiGet('/api/upgrade/v2/content/drop-radar/detail', p).catch(e => ({ error: e.message })),
      apiGet('/api/upgrade/v2/content/drop-radar/team', { airdrop_id }).catch(e => ({ error: e.message })),
      apiGet('/api/upgrade/v2/content/drop-radar/x-following', { airdrop_id }).catch(e => ({ error: e.message })),
    ]);
    if (detail.error) return { error: `Project not found or invalid airdrop_id "${airdrop_id}". Use "list" to browse available projects.`, detail: detail.error };
    return { ...detail, team: team.data || team, x_following: xFollowing.data || xFollowing };
  },
  widgets: ({ lan } = {}) => {
    const p = {};
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/drop-radar/widgets', p);
  },
  filters: ({ lan } = {}) => {
    const p = {};
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/drop-radar/filters', p);
  },
  events: ({ airdrop_id } = {}) => {
    return apiGet('/api/upgrade/v2/content/drop-radar/events', { airdrop_id });
  },
  team: ({ airdrop_id } = {}) => {
    return apiGet('/api/upgrade/v2/content/drop-radar/team', { airdrop_id });
  },
  x_following: ({ airdrop_id } = {}) => {
    return apiGet('/api/upgrade/v2/content/drop-radar/x-following', { airdrop_id });
  },
  status_changes: ({ days, page, page_size, lan } = {}) => {
    const p = {};
    if (days) p.days = days;
    if (page) p.page = page;
    if (page_size) p.page_size = page_size;
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/drop-radar/status-changes', p);
  },
  tweets: ({ keywords, page_size, last_id, lan } = {}) => {
    const p = { keywords };
    if (page_size) p.page_size = page_size;
    if (last_id) p.last_id = last_id;
    if (lan) p.lan = lan;
    return apiGet('/api/upgrade/v2/content/drop-radar/tweets', p);
  },
});
