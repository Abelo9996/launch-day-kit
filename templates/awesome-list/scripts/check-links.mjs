#!/usr/bin/env node
// Offline: checks every link is well formed and every #anchor exists.
// --online: also requests every external URL (HEAD, then GET on 405/403).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { slugify } from './lint-list.mjs';

export function extractLinks(text) {
  const out = [];
  let inCode = false;
  text.split('\n').forEach((line, i) => {
    if (line.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    for (const m of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)\)/g)) out.push({ url: m[1], line: i + 1 });
  });
  return out;
}

export function checkOffline(text, file, exists = existsSync) {
  const errors = [];
  const anchors = new Set(text.split('\n').filter((l) => /^#{1,6} /.test(l)).map((l) => slugify(l.replace(/^#+ /, ''))));
  for (const { url, line } of extractLinks(text)) {
    if (url.startsWith('#')) {
      if (!anchors.has(url.slice(1))) errors.push(`${file}:${line} broken anchor ${url}`);
    } else if (/^https?:\/\//.test(url)) {
      try { new URL(url); } catch { errors.push(`${file}:${line} malformed URL ${url}`); }
    } else if (!url.startsWith('mailto:')) {
      if (!exists(url.split('#')[0])) errors.push(`${file}:${line} missing local file ${url}`);
    }
  }
  return errors;
}

async function checkUrl(url) {
  const opts = { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 link-check' } };
  try {
    let r = await fetch(url, { ...opts, method: 'HEAD' });
    if ([403, 405, 404].includes(r.status)) r = await fetch(url, { ...opts, method: 'GET' });
    return r.status;
  } catch (e) {
    return e.name === 'TimeoutError' ? 'timeout' : e.message;
  }
}

async function main() {
  const online = process.argv.includes('--online');
  const files = ['README.md', 'README.zh-CN.md', 'CONTRIBUTING.md'].filter((f) => existsSync(f));
  let errors = [];
  const external = new Map();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    errors = errors.concat(checkOffline(text, f));
    for (const { url, line } of extractLinks(text)) if (/^https?:/.test(url) && !external.has(url)) external.set(url, `${f}:${line}`);
  }
  const warnings = [];
  if (online) {
    const queue = [...external];
    const worker = async () => {
      while (queue.length) {
        const [url, where] = queue.shift();
        const status = await checkUrl(url);
        if (typeof status === 'number' && status < 400) continue;
        if (status === 429 || status === 403) warnings.push(`${where} ${status} ${url}`);
        else errors.push(`${where} ${status} ${url}`);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
  }
  if (warnings.length) console.warn('warnings (blocked or rate limited, not failing):\n' + warnings.join('\n'));
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`links ok: ${external.size} external${online ? ' (checked online)' : ' (syntax only, pass --online to fetch)'}`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
