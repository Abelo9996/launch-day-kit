#!/usr/bin/env node
// Launch rehearsal: scaffold every template with a fake platform, install, run its
// smoke test, check it is publishable, and time each step.
//
//   node scripts/rehearse.mjs [--only a,b] [--out dir] [--no-zh] [--write] [--keep]

import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates, scaffold } from '../bin/new-launch.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

const only = value('--only') ? value('--only').split(',') : listTemplates();
const outRoot = resolve(value('--out') || mkdtempSync(join(tmpdir(), 'launch-rehearsal-')));
const zh = !flag('--no-zh');
const PLATFORM = 'Zephyr Agent 2';
const LEFTOVER = /__(PLATFORM|SLUG|OWNER|REPO_URL|DATE|YEAR)__/;

function sh(cmd, cwd) {
  const t = Date.now();
  try {
    execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, CI: process.env.CI || '1' }, maxBuffer: 64 * 1024 * 1024 });
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, out: `${e.stdout || ''}${e.stderr || ''}`.slice(-4000) };
  }
}

function files(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n === 'dist' || n === 'release') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, acc);
    else acc.push(p);
  }
  return acc;
}

function publishable(dir) {
  const problems = [];
  for (const f of files(dir)) {
    const text = readFileSync(f, 'utf8');
    if (LEFTOVER.test(text)) problems.push(`placeholder left in ${f.slice(dir.length + 1)}`);
    if (/[\u2013\u2014]/.test(text)) problems.push(`en/em dash in ${f.slice(dir.length + 1)}`);
  }
  if (!existsSync(join(dir, 'LICENSE'))) problems.push('no LICENSE');
  const readme = existsSync(join(dir, 'README.md')) ? readFileSync(join(dir, 'README.md'), 'utf8') : '';
  if (!/^# .+\n\n(\*\*|> ).+/m.test(readme)) problems.push('README lacks a one-sentence headline under the title');
  if (zh && !existsSync(join(dir, 'README.zh-CN.md'))) problems.push('no README.zh-CN.md');
  const log = sh('git log --oneline -1', dir);
  if (!log.ok) problems.push('no initial commit');
  return problems;
}

const fmt = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const rows = [];
let failed = false;
console.log(`rehearsal dir: ${outRoot}`);
for (const template of only) {
  const slug = `zephyr-agent-${template}`;
  const dir = join(outRoot, slug);
  const row = { template, steps: {}, problems: [] };
  const t0 = Date.now();
  try {
    scaffold({ platform: PLATFORM, slug, template, out: dir, zh, git: true, date: new Date().toISOString().slice(0, 10) });
    row.steps.scaffold = Date.now() - t0;
  } catch (e) {
    row.problems.push(`scaffold: ${e.message}`);
  }
  if (!row.problems.length) {
    const hasLock = existsSync(join(dir, 'package-lock.json'));
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const hasDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length > 0;
    if (hasDeps) {
      const r = sh(hasLock ? 'npm ci --no-audit --no-fund' : 'npm install --no-audit --no-fund', dir);
      row.steps.install = r.ms;
      if (!r.ok) row.problems.push(`install failed:\n${r.out}`);
    } else row.steps.install = 0;
    if (!row.problems.length) {
      const r = sh('npm test', dir);
      row.steps.test = r.ms;
      if (!r.ok) row.problems.push(`npm test failed:\n${r.out}`);
    }
    row.problems.push(...publishable(dir));
  }
  row.total = Date.now() - t0;
  row.ok = row.problems.length === 0;
  failed ||= !row.ok;
  rows.push(row);
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${template}  scaffold ${fmt(row.steps.scaffold ?? 0)}  install ${fmt(row.steps.install ?? 0)}  test ${fmt(row.steps.test ?? 0)}  total ${fmt(row.total)}`);
  for (const p of row.problems) console.log('  ' + p.split('\n').join('\n  '));
}

const env = `node ${process.version}, ${process.platform}-${process.arch}${process.env.CI ? ', CI' : ''}`;
const table = [
  `Run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, ${env}, platform "${PLATFORM}", zh ${zh ? 'on' : 'off'}.`,
  '',
  '| Template | Result | Scaffold | Install | Smoke test | Total (machine time) |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.template} | ${r.ok ? 'pass' : 'FAIL'} | ${fmt(r.steps.scaffold ?? 0)} | ${fmt(r.steps.install ?? 0)} | ${fmt(r.steps.test ?? 0)} | ${fmt(r.total)} |`),
].join('\n');

if (flag('--write')) {
  const p = join(ROOT, 'REHEARSAL.md');
  const doc = readFileSync(p, 'utf8');
  writeFileSync(p, doc.replace(/<!-- timings:start -->[\s\S]*<!-- timings:end -->/, `<!-- timings:start -->\n${table}\n<!-- timings:end -->`));
  console.log('updated REHEARSAL.md');
} else {
  console.log('\n' + table);
}
if (!flag('--keep') && !value('--out')) rmSync(outRoot, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
