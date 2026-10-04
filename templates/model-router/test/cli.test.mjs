import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.mjs', import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ROUTER_CONFIG: '' } });

test('no config: exits 1 and says how to create one', () => {
  const r = run([], mkdtempSync(join(tmpdir(), 'router-cli-')));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No config at router\.config\.json/);
  assert.match(r.stderr, /--init/);
  assert.doesNotMatch(r.stderr, /at Object\.|node:fs/);
});

test('--init writes router.config.json once', () => {
  const dir = mkdtempSync(join(tmpdir(), 'router-cli-'));
  assert.equal(run(['--init'], dir).status, 0);
  assert.ok(existsSync(join(dir, 'router.config.json')));
  const again = run(['--init'], dir);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already exists/);
});

test('broken JSON: exits 1 with the file name, no stack trace', () => {
  const dir = mkdtempSync(join(tmpdir(), 'router-cli-'));
  writeFileSync(join(dir, 'router.config.json'), '{bad');
  const r = run([], dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Could not load router\.config\.json/);
  assert.doesNotMatch(r.stderr, /at JSON\.parse/);
});

test('busy port: exits 1 and suggests --port', async () => {
  const blocker = createServer().listen(0, '127.0.0.1');
  await new Promise((r) => blocker.on('listening', r));
  const port = blocker.address().port;
  const dir = mkdtempSync(join(tmpdir(), 'router-cli-'));
  writeFileSync(join(dir, 'router.config.json'), JSON.stringify({ log: null, providers: {}, models: {} }));
  const child = spawn(process.execPath, [CLI, '--port', String(port)], { cwd: dir });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  const code = await new Promise((r) => child.on('exit', r));
  blocker.close();
  assert.equal(code, 1);
  assert.match(err, /already in use.*--port/s);
});
