const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig, resolveLaunch, splitCommand, writeDefaultConfig } = require('../src/config');

test('splitCommand handles quotes', () => {
  assert.deepEqual(splitCommand('agent --model "big one"'), ['agent', '--model', 'big one']);
});

test('empty command falls back to the login shell', () => {
  const l = resolveLaunch(loadConfig(null, {}), 'linux', { SHELL: '/bin/zsh' });
  assert.equal(l.file, '/bin/zsh');
  assert.equal(l.usingShell, true);
  assert.equal(l.env.TERM, 'xterm-256color');
});

test('AGENT_CMD overrides config file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  const p = path.join(dir, 'config.json');
  fs.writeFileSync(p, JSON.stringify({ command: 'from-file', args: ['x'] }));
  assert.equal(loadConfig(p, {}).command, 'from-file');
  const cfg = loadConfig(p, { AGENT_CMD: 'from-env --fast' });
  assert.deepEqual([cfg.command, cfg.args], ['from-env', ['--fast']]);
});

test('broken config reports an error and keeps defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  const p = path.join(dir, 'config.json');
  fs.writeFileSync(p, '{nope');
  const cfg = loadConfig(p, {});
  assert.match(cfg.configError, /config.json/);
  assert.equal(cfg.command, '');
});

test('writeDefaultConfig creates once', () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-')), 'a', 'config.json');
  assert.equal(writeDefaultConfig(p), true);
  assert.equal(writeDefaultConfig(p), false);
  assert.equal(JSON.parse(fs.readFileSync(p, 'utf8')).title, '__PLATFORM__');
});

test('node-pty loads and runs a command', async () => {
  const pty = require('node-pty');
  const isWin = process.platform === 'win32';
  const p = pty.spawn(isWin ? 'cmd.exe' : '/bin/sh', isWin ? ['/c', 'echo pty-ok'] : ['-c', 'echo pty-ok'], { cols: 80, rows: 24 });
  let out = '';
  p.onData((d) => { out += d; });
  await new Promise((r) => p.onExit(r));
  assert.match(out, /pty-ok/);
});
