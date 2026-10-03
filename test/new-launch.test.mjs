import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates, parseArgs, placeholders, render, scaffold, validate } from '../bin/new-launch.mjs';

const CLI = fileURLToPath(new URL('../bin/new-launch.mjs', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'new-launch-'));
const LEFTOVER = /__(PLATFORM|SLUG|OWNER|REPO_URL|DATE|YEAR)__/;

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if (n === '.git') continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
}

test('all five templates exist', () => {
  assert.deepEqual(listTemplates(), ['awesome-list', 'desktop-shell', 'model-router', 'plugin-market', 'tui-wrapper']);
});

test('parseArgs and validate', () => {
  const o = parseArgs(['--platform', 'Qwen 4', '--slug', 'qwen4-router', '--template', 'model-router', '--out', 'x', '--zh']);
  assert.equal(o.platform, 'Qwen 4');
  assert.equal(o.zh, true);
  assert.deepEqual(validate(o), []);
  assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
  assert.throws(() => parseArgs(['--slug']), /Missing value/);
  const errs = validate({ slug: 'Bad_Slug', template: 'nope' }).join('\n');
  assert.match(errs, /--platform is required/);
  assert.match(errs, /--slug must be/);
  assert.match(errs, /unknown template/);
});

test('placeholders build the repo URL and date', () => {
  const v = placeholders({ platform: 'P', slug: 's', owner: 'me', date: '2026-10-03' });
  assert.equal(v.__REPO_URL__, 'https://github.com/me/s');
  assert.equal(v.__YEAR__, '2026');
});

test('render strips or keeps zh blocks', () => {
  const t = 'a\n<!-- zh:start -->\nzh __SLUG__\n<!-- zh:end -->\nb __SLUG__\n';
  assert.equal(render(t, { __SLUG__: 'x' }, false), 'a\nb x\n');
  assert.equal(render(t, { __SLUG__: 'x' }, true), 'a\nzh x\nb x\n');
});

for (const template of ['awesome-list', 'desktop-shell', 'model-router', 'plugin-market', 'tui-wrapper']) {
  test(`scaffold ${template}: no placeholders left, zh handling, renames`, () => {
    for (const zh of [false, true]) {
      const out = join(tmp(), 'repo');
      const r = scaffold({ platform: 'Zephyr Agent', slug: 'zephyr-thing', template, out, zh, git: false, owner: 'someone', date: '2026-10-03' });
      assert.ok(r.files > 3);
      const files = walk(out);
      for (const f of files) {
        assert.ok(!f.includes('__SLUG__'), `unrenamed path ${f}`);
        assert.ok(!LEFTOVER.test(readFileSync(f, 'utf8')), `placeholder left in ${f}`);
      }
      assert.ok(existsSync(join(out, '.gitignore')) && !existsSync(join(out, 'gitignore')));
      assert.match(readFileSync(join(out, 'LICENSE'), 'utf8'), /Copyright \(c\) 2026 Abel Yagubyan/);
      const readme = readFileSync(join(out, 'README.md'), 'utf8');
      assert.match(readme, /zephyr-thing|Zephyr Agent/);
      assert.ok(!files.some((f) => f.includes('node_modules')));
      assert.equal(existsSync(join(out, 'README.zh-CN.md')), zh);
      assert.equal(readme.includes('README.zh-CN.md'), zh);
    }
  });
}

test('refuses a non-empty output dir', () => {
  const out = tmp();
  writeFileSync(join(out, 'x'), '');
  assert.throws(() => scaffold({ platform: 'P', slug: 'p', template: 'model-router', out, git: false }), /not empty/);
});

test('CLI: help, bad args, and a real run with git', () => {
  assert.equal(spawnSync(process.execPath, [CLI, '--help']).status, 0);
  assert.equal(spawnSync(process.execPath, [CLI, '--nope']).status, 2);
  assert.equal(spawnSync(process.execPath, [CLI, '--platform', 'P']).status, 1);
  const out = join(tmp(), 'r');
  const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' };
  const r = spawnSync(process.execPath, [CLI, '--platform', 'Zephyr', '--slug', 'zephyr-list', '--template', 'awesome-list', '--out', out, '--zh'], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /git: committed/);
  const log = execFileSync('git', ['log', '--format=%s'], { cwd: out, encoding: 'utf8' });
  assert.match(log, /Initial awesome-list for Zephyr/);
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: out, encoding: 'utf8' }), '');
});
