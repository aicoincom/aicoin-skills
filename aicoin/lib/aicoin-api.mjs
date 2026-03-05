#!/usr/bin/env node
// AiCoin API client with HMAC signing - shared lib
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Auto-load .env files (OpenClaw exec may not inject env vars into child processes)
function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),                           // workspace root
    resolve(process.env.HOME || '', '.openclaw', 'workspace', '.env'), // OpenClaw workspace
    resolve(process.env.HOME || '', '.openclaw', '.env'),     // OpenClaw global
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const lines = readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        // Only set if not already defined (env vars take precedence)
        if (!process.env[key]) process.env[key] = val;
      }
    } catch { /* ignore unreadable files */ }
  }
}
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaults = JSON.parse(readFileSync(resolve(__dirname, 'defaults.json'), 'utf-8'));

const BASE = process.env.AICOIN_BASE_URL || 'https://open.aicoin.com';
const KEY = process.env.AICOIN_ACCESS_KEY_ID || defaults.accessKeyId;
const SECRET = process.env.AICOIN_ACCESS_SECRET || defaults.accessSecret;

function sign() {
  const nonce = randomBytes(4).toString('hex');
  const ts = Math.floor(Date.now() / 1000).toString();
  const str = `AccessKeyId=${KEY}&SignatureNonce=${nonce}&Timestamp=${ts}`;
  const hex = createHmac('sha1', SECRET).update(str).digest('hex');
  const sig = Buffer.from(hex, 'binary').toString('base64');
  return { AccessKeyId: KEY, SignatureNonce: nonce, Timestamp: ts, Signature: sig };
}

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams({ ...params, ...sign() });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const text = await res.text();
    let hint = '';
    if (res.status === 403) {
      hint = '\nHint: This feature requires a paid AiCoin API subscription. See SKILL.md tier table. Do NOT retry — use an alternative data source or suggest upgrading at https://www.aicoin.com/opendata';
    } else if (res.status === 400) {
      if (text.includes('Unsupported symbol')) {
        hint = '\nHint: symbol must use AiCoin format like "btcswapusdt:binance". Short names (BTC, ETH, SOL) are auto-resolved by coin.mjs.';
      } else if (text.includes('invalid parameters')) {
        hint = '\nHint: Check SKILL.md for the correct parameter format and required fields.';
      }
    } else if (res.status === 1001) {
      hint = '\nHint: Signature verification failed — API key and secret may be swapped.';
    }
    throw new Error(`API ${res.status}: ${text}${hint}`);
  }
  const json = await res.json();
  // Check for API-level errors (HTTP 200 but success=false)
  if (json.success === false && (json.errorCode === 304 || json.errorCode === 403)) {
    json._note = 'This endpoint requires a paid AiCoin API subscription. The free key does not have access.';
  }
  return json;
}

export async function apiPost(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ...sign() }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// CLI helper: parse args and run
export function cli(handlers) {
  const [action, ...rest] = process.argv.slice(2);
  if (!action || !handlers[action]) {
    console.log(`Usage: node <script> <action> [json-params]\nActions: ${Object.keys(handlers).join(', ')}`);
    process.exit(1);
  }
  const params = rest.length ? JSON.parse(rest.join(' ')) : {};
  handlers[action](params).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
