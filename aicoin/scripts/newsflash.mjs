#!/usr/bin/env node
// AiCoin Newsflash (OpenData) CLI
import { apiGet, cli } from '../lib/aicoin-api.mjs';

cli({
  search: ({ word, page, size } = {}) => {
    const p = { word };
    if (page) p.page = page;
    if (size) p.size = size;
    return apiGet('/api/upgrade/v2/content/newsflash/search', p);
  },
  detail: ({ flash_id } = {}) => {
    return apiGet('/api/upgrade/v2/content/newsflash/detail', { flash_id });
  },
});
