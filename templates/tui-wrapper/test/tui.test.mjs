import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/app.mjs';
import { DEFAULTS, buildInvocation, loadConfig, splitCommand } from '../src/config.mjs';
import { memoryStore } from '../src/sessions.mjs';

const FAKE = new URL('./fake-agent.mjs', import.meta.url).pathname;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return true;
    await wait(25);
  }
  return false;
}

test('splitCommand honors quotes', () => {
  assert.deepEqual(splitCommand(`agent -p "{prompt}" --name 'a b'`), ['agent', '-p', '{prompt}', '--name', 'a b']);
});

test('config: args after -- win, {prompt} and {session} substituted', () => {
  const cfg = loadConfig({ argv: ['--', 'agent', '-p', '{prompt}', '--s', '{session}'], env: {}, cwd: '/nonexistent' });
  const inv = buildInvocation(cfg, 'hi there', 'abc');
  assert.equal(inv.command, 'agent');
  assert.deepEqual(inv.args, ['-p', 'hi there', '--s', 'abc']);
  assert.equal(inv.stdin, null);
});

test('config: prompt goes to stdin when args have no {prompt}', () => {
  const cfg = loadConfig({ argv: [], env: { AGENT_CMD: 'agent --json' }, cwd: '/nonexistent' });
  assert.equal(buildInvocation(cfg, 'x', 's').stdin, 'x\n');
});

test('renders, runs the agent, streams output, manages sessions', async () => {
  const store = memoryStore();
  const config = { ...DEFAULTS, title: 'Test Platform', command: process.execPath, args: [FAKE, '{prompt}'] };
  const ui = render(React.createElement(App, { config, store, rows: 24 }));
  await wait(50);
  assert.match(ui.lastFrame(), /Test Platform/);
  assert.match(ui.lastFrame(), /Sessions/);

  for (const ch of 'hello world') ui.stdin.write(ch);
  await wait(30);
  assert.match(ui.lastFrame(), /> hello world/);
  ui.stdin.write('\r');
  assert.ok(await until(() => /agent got: hello world/.test(ui.lastFrame())), ui.lastFrame());
  assert.ok(await until(() => /idle/.test(ui.lastFrame())));
  assert.equal(store.load()[0].name, 'hello world');

  ui.stdin.write('\x0e'); // ctrl+n
  await wait(50);
  assert.match(ui.lastFrame(), /2 session 2/);
  for (const ch of 'please fail') ui.stdin.write(ch);
  await wait(30);
  ui.stdin.write('\r');
  assert.ok(await until(() => /\[exit 3\]/.test(ui.lastFrame())), ui.lastFrame());

  ui.stdin.write('\t'); // back to session 1
  await wait(50);
  assert.match(ui.lastFrame(), /agent got: hello world/);
  assert.equal(store.load().length, 2);
  ui.unmount();
});

test('missing command reports a clear error', async () => {
  const config = { ...DEFAULTS, command: 'definitely-not-a-real-agent-cmd', args: ['{prompt}'] };
  const ui = render(React.createElement(App, { config, store: memoryStore(), rows: 20 }));
  await wait(50);
  for (const ch of 'x') ui.stdin.write(ch);
  await wait(30);
  ui.stdin.write('\r');
  assert.ok(await until(() => /failed to start/.test(ui.lastFrame())), ui.lastFrame());
  ui.unmount();
});

test('text and Enter in one chunk (paste, fast typing) still sends the prompt', async () => {
  const store = memoryStore();
  const config = { ...DEFAULTS, command: process.execPath, args: [FAKE, '{prompt}'] };
  const ui = render(React.createElement(App, { config, store, rows: 24 }));
  await wait(50);
  ui.stdin.write('pasted prompt\r');
  assert.ok(await until(() => /agent got: pasted prompt/.test(ui.lastFrame())), ui.lastFrame());
  ui.unmount();
});

test('newlines inside pasted text become spaces instead of sending', async () => {
  const config = { ...DEFAULTS, command: process.execPath, args: [FAKE, '{prompt}'] };
  const ui = render(React.createElement(App, { config, store: memoryStore(), rows: 24 }));
  await wait(50);
  ui.stdin.write('line one\nline two');
  await wait(30);
  assert.match(ui.lastFrame(), /> line one line two/);
  ui.unmount();
});

test('says so when no agent command is configured', async () => {
  const config = loadConfig({ argv: [], env: {}, cwd: '/nonexistent' });
  if (config.configPath) return; // a real ~/.config file on this machine
  assert.equal(config.configured, false);
  const ui = render(React.createElement(App, { config, store: memoryStore(), rows: 24 }));
  await wait(50);
  assert.match(ui.lastFrame(), /No agent command set/);
  ui.unmount();
  const set = loadConfig({ argv: ['--', 'agent'], env: {}, cwd: '/nonexistent' });
  assert.equal(set.configured, true);
});
