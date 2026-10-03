#!/usr/bin/env node
// Repo hygiene: no en/em dashes anywhere, no attribution boilerplate in templates,
// no absolute home-directory paths.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const ATTRIBUTION = /co-authored-by|generated (with|by)|written by (an )?ai|\banthropic\b|\bclaude\b|chatgpt|\bcopilot\b/i;
const HOME = /\/(Users|home)\/[a-z][a-z0-9_-]*\//;

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  if (f.endsWith('package-lock.json')) continue;
  text.split('\n').forEach((line, i) => {
    if (DASHES.test(line)) problems.push(`${f}:${i + 1} en/em dash`);
    if (f.startsWith('templates/') && ATTRIBUTION.test(line)) problems.push(`${f}:${i + 1} attribution text in template`);
    if (HOME.test(line)) problems.push(`${f}:${i + 1} absolute home path`);
  });
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`text checks ok (${files.length} files)`);
