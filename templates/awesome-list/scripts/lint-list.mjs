#!/usr/bin/env node
// Checks list formatting, table of contents and duplicate links in README files.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ENTRY = /^- \[([^\]]+)\]\((https?:\/\/[^)\s]+|[^)\s]+)\) - (\S.*)$/;
const ENDS = /[.!?。！？)）]$/;
const NON_LIST = new Set(['contents', 'contributing', 'license', '目录', '贡献', '许可证', '中文']);

export function slugify(heading) {
  return heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
}

export function lint(text, file = 'README.md') {
  const errors = [];
  const lines = text.split('\n');
  const headings = [];
  const toc = [];
  const urls = new Map();
  let section = null;
  let inCode = false;
  lines.forEach((line, i) => {
    const n = i + 1;
    if (line.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    if (/\s+$/.test(line)) errors.push(`${file}:${n} trailing whitespace`);
    if (/[\u2013\u2014]/.test(line)) errors.push(`${file}:${n} use a plain hyphen, not an en or em dash`);
    const h = line.match(/^## (.+)$/);
    if (h) {
      section = h[1].trim();
      headings.push(section);
      return;
    }
    if (!line.startsWith('- ')) return;
    if (section && ['contents', '目录'].includes(section.toLowerCase())) {
      const m = line.match(/^- \[([^\]]+)\]\(#([^)]+)\)$/);
      if (!m) errors.push(`${file}:${n} contents line must be "- [Heading](#anchor)"`);
      else toc.push({ text: m[1], anchor: m[2], n });
      return;
    }
    if (!section || NON_LIST.has(section.toLowerCase())) return;
    const m = line.match(ENTRY);
    if (!m) {
      errors.push(`${file}:${n} entry must be "- [Name](link) - Description."`);
      return;
    }
    const [, , url, desc] = m;
    if (!ENDS.test(desc)) errors.push(`${file}:${n} description must end with a period`);
    if (/^[a-z]/.test(desc)) errors.push(`${file}:${n} description must start with a capital letter`);
    const key = url.replace(/\/+$/, '').toLowerCase();
    if (urls.has(key)) errors.push(`${file}:${n} duplicate link (also on line ${urls.get(key)})`);
    else urls.set(key, n);
  });
  if (toc.length) {
    const listed = headings.filter((h) => !NON_LIST.has(h.toLowerCase()));
    const tocTexts = toc.map((t) => t.text);
    for (const h of listed) if (!tocTexts.includes(h)) errors.push(`${file}: section "${h}" missing from contents`);
    for (const t of toc) {
      if (!listed.includes(t.text)) errors.push(`${file}:${t.n} contents entry "${t.text}" has no matching section`);
      else if (slugify(t.text) !== t.anchor) errors.push(`${file}:${t.n} anchor should be #${slugify(t.text)}`);
    }
    if (listed.join('|') !== tocTexts.filter((t) => listed.includes(t)).join('|')) errors.push(`${file}: contents order differs from section order`);
  }
  return errors;
}

function main() {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : ['README.md', 'README.zh-CN.md'].filter((f) => existsSync(f));
  let errors = [];
  for (const f of files) errors = errors.concat(lint(readFileSync(f, 'utf8'), f));
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log(`lint ok: ${files.join(', ')}`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
