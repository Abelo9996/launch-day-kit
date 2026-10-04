import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepo, detectOwner, listTemplates, parseArgs, placeholders, render, scaffold, validate } from '../bin/new-launch.mjs';

const CLI = fileURLToPath(new URL('../bin/new-launch.mjs', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'new-launch-'));
const LEFTOVER = /__(PLATFORM|SLUG|OWNER|AUTHOR|REPO_URL|DATE|YEAR)__/;

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
      const r = scaffold({ platform: 'Zephyr Agent', slug: 'zephyr-thing', template, out, zh, git: false, owner: 'someone', author: 'Jane Doe', date: '2026-10-03' });
      assert.ok(r.todos.length > 0, 'fresh scaffold should list stand-ins to replace');
      assert.ok(r.files > 3);
      const files = walk(out);
      for (const f of files) {
        assert.ok(!f.includes('__SLUG__'), `unrenamed path ${f}`);
        assert.ok(!LEFTOVER.test(readFileSync(f, 'utf8')), `placeholder left in ${f}`);
      }
      assert.ok(existsSync(join(out, '.gitignore')) && !existsSync(join(out, 'gitignore')));
      assert.match(readFileSync(join(out, 'LICENSE'), 'utf8'), /Copyright \(c\) 2026 Jane Doe\n/);
      for (const f of files) {
        const text = readFileSync(f, 'utf8');
        assert.doesNotMatch(text, /Yagubyan|Abelo9996|launch-day-kit/, `kit identity leaked into ${f}`);
        if (f.endsWith('.md')) assert.doesNotMatch(text, /\n\n\n/, `run of blank lines in ${f}`);
      }
      const readme = readFileSync(join(out, 'README.md'), 'utf8');
      assert.match(readme, /zephyr-thing|Zephyr Agent/);
      if (template !== 'awesome-list') assert.match(readme, /<!-- TODO before posting: put a real (recording|screenshot) at docs\//);
      assert.match(readme, /not affiliated with the vendor of Zephyr Agent/);
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
  const env = { ...process.env, LAUNCH_OWNER: 'octo', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' };
  const r = spawnSync(process.execPath, [CLI, '--platform', 'Zephyr', '--slug', 'zephyr-list', '--template', 'awesome-list', '--out', out, '--zh'], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /git: committed/);
  assert.match(r.stdout, /gh repo create octo\/zephyr-list --public/);
  assert.match(r.stdout, /replace \d+ stand-in/);
  assert.match(r.stdout, /--check /);
  const log = execFileSync('git', ['log', '--format=%s'], { cwd: out, encoding: 'utf8' });
  assert.match(log, /Initial awesome-list for Zephyr/);
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: out, encoding: 'utf8' }), '');
});

test('owner: gh login, then git github.user, else a clear error', () => {
  const fake = (answers) => (cmd, args) => {
    const a = answers[`${cmd} ${args[0]}`];
    if (a instanceof Error) throw a;
    return a ?? '';
  };
  assert.equal(detectOwner(fake({ 'gh api': 'octocat\n' })), 'octocat');
  assert.equal(detectOwner(fake({ 'gh api': new Error('not logged in'), 'git config': 'gituser' })), 'gituser');
  assert.equal(detectOwner(fake({ 'gh api': new Error('ENOENT'), 'git config': new Error('unset') })), '');
  const saved = process.env.LAUNCH_OWNER;
  delete process.env.LAUNCH_OWNER;
  try {
    assert.throws(() => placeholders({ platform: 'P', slug: 's' }, fake({})), /--owner <github-user-or-org>[\s\S]*gh auth login/);
    assert.throws(() => placeholders({ platform: 'P', slug: 's', owner: 'has space' }, fake({})), /not a GitHub user/);
    const v = placeholders({ platform: 'P', slug: 's', owner: 'me' }, fake({ 'git config': 'Jane Doe' }));
    assert.equal(v.__AUTHOR__, 'Jane Doe');
    assert.equal(placeholders({ platform: 'P', slug: 's', owner: 'me' }, fake({})).__AUTHOR__, 'me');
  } finally {
    if (saved !== undefined) process.env.LAUNCH_OWNER = saved;
  }
});

test('CLI: no owner available is an error that says what to do, and writes nothing', () => {
  const home = tmp();
  const out = join(tmp(), 'r');
  // A HOME with no gh login and no git config; PATH without gh.
  const env = { PATH: '/usr/bin:/bin', HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1' };
  const r = spawnSync(process.execPath, [CLI, '--platform', 'P', '--slug', 'p-list', '--template', 'awesome-list', '--out', out], { env, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Could not work out your GitHub user/);
  assert.match(r.stderr, /--owner/);
  assert.equal(existsSync(out), false);
});

test('no git identity: repo is initialized but not committed under an invented identity', () => {
  const home = tmp();
  const out = join(tmp(), 'r');
  const env = { PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', LAUNCH_OWNER: 'octo' };
  const r = spawnSync(process.execPath, [CLI, '--platform', 'P', '--slug', 'p-list', '--template', 'awesome-list', '--out', out], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /not committed: set git config --global user.name and user.email/);
  assert.ok(existsSync(join(out, '.git')));
  assert.notEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: out, env }).status, 0);
});

test('--check lists stand-ins and missing images, and passes once they are replaced', () => {
  const out = join(tmp(), 'repo');
  scaffold({ platform: 'Zephyr', slug: 'zephyr-tui', template: 'tui-wrapper', out, git: false, owner: 'octo', date: '2026-10-03' });
  const todos = checkRepo(out).join('\n');
  assert.match(todos, /README\.md:\d+ +stand-in command/);
  assert.match(todos, /docs\/demo\.gif does not exist yet/);
  assert.match(todos, /zephyr-tui\.config\.example\.json:\d+ +stand-in command/);
  const bad = spawnSync(process.execPath, [CLI, '--check', out], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /thing\(s\) to replace before going public/);
  for (const f of ['README.md', 'zephyr-tui.config.example.json']) {
    writeFileSync(join(out, f), readFileSync(join(out, f), 'utf8').split('your-agent-cli').join('zephyr'));
  }
  writeFileSync(join(out, 'docs', 'demo.gif'), 'GIF89a');
  const good = spawnSync(process.execPath, [CLI, '--check', out], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stdout);
  assert.match(good.stdout, /Nothing left from the template/);
});

test('--check flags example entries in a fresh awesome list and router config', () => {
  const list = join(tmp(), 'list');
  scaffold({ platform: 'Zephyr', slug: 'awesome-zephyr', template: 'awesome-list', out: list, git: false, owner: 'octo', date: '2026-10-03' });
  assert.match(checkRepo(list).join('\n'), /README\.md:\d+ +example entry/);
  const router = join(tmp(), 'router');
  scaffold({ platform: 'Zephyr', slug: 'zephyr-router', template: 'model-router', out: router, git: false, owner: 'octo', date: '2026-10-03' });
  assert.match(checkRepo(router).join('\n'), /router\.config\.example\.json:\d+ +stand-in model ID/);
});
