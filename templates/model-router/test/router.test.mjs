import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as http } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeConfig, loadConfig } from '../src/config.mjs';
import { createServer } from '../src/server.mjs';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));

let down, up, router, base, logPath;
const seen = [];

before(async () => {
  down = http((req, res) => { res.writeHead(503); res.end('{"error":"overloaded"}'); });
  up = http(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    seen.push({ url: req.url, auth: req.headers.authorization, model: body.model });
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n');
      setTimeout(() => { res.write('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'); res.end('data: [DONE]\n\n'); }, 20);
      return;
    }
    if (body.model === 'bad-request') { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"nope"}}'); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'x', choices: [{ message: { role: 'assistant', content: `echo:${body.model}` } }], usage: { total_tokens: 7 } }));
  });
  const downUrl = await listen(down);
  const upUrl = await listen(up);
  logPath = join(mkdtempSync(join(tmpdir(), 'router-')), 'req.jsonl');
  const cfg = normalizeConfig({
    log: logPath,
    providers: {
      flaky: { baseUrl: downUrl + '/v1' },
      good: { baseUrl: upUrl + '/v1/', apiKeyEnv: 'GOOD_KEY' },
      dead: { baseUrl: 'http://127.0.0.1:1/v1' },
    },
    models: {
      main: ['flaky/m-1', 'dead/m-2', 'good/vendor/m-3'],
      strict: ['good/bad-request', 'flaky/never'],
      solo: 'flaky/m-1',
    },
  });
  router = createServer(cfg, { env: { GOOD_KEY: 'sk-test' } });
  base = await listen(router);
});

after(() => { for (const s of [down, up, router]) s.close(); });

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('falls back past 5xx and connection errors, rewrites model, adds key', async () => {
  const r = await post('/v1/chat/completions', { model: 'main', messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-router-provider'), 'good');
  const j = await r.json();
  assert.equal(j.choices[0].message.content, 'echo:vendor/m-3');
  const last = seen.at(-1);
  assert.equal(last.url, '/v1/chat/completions');
  assert.equal(last.auth, 'Bearer sk-test');
});

test('does not fall back on a plain 4xx', async () => {
  const r = await post('/v1/chat/completions', { model: 'strict', messages: [] });
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('x-router-provider'), 'good');
});

test('returns the last upstream error when the only target fails', async () => {
  const r = await post('/v1/chat/completions', { model: 'solo', messages: [] });
  assert.equal(r.status, 503);
});

test('passes provider/model through without a config entry', async () => {
  const r = await post('/v1/chat/completions', { model: 'good/direct-model', messages: [] });
  assert.equal((await r.json()).choices[0].message.content, 'echo:direct-model');
});

test('unknown model is a 404 with the known list', async () => {
  const r = await post('/v1/chat/completions', { model: 'nope', messages: [] });
  assert.equal(r.status, 404);
  assert.match((await r.json()).error.message, /Known: main/);
});

test('streams SSE through unchanged', async () => {
  const r = await post('/v1/chat/completions', { model: 'main', stream: true, messages: [] });
  assert.equal(r.headers.get('content-type'), 'text/event-stream');
  const text = await r.text();
  assert.match(text, /"hel"[\s\S]*"lo"[\s\S]*\[DONE\]/);
});

test('lists models and health', async () => {
  const m = await (await fetch(base + '/v1/models')).json();
  assert.deepEqual(m.data.map((d) => d.id).sort(), ['main', 'solo', 'strict']);
  assert.equal((await fetch(base + '/healthz')).status, 200);
});

test('writes one JSONL log line per routed request with attempts', async () => {
  await new Promise((r) => setTimeout(r, 50));
  const lines = readFileSync(logPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const first = lines.find((l) => l.model === 'main' && !l.stream);
  assert.deepEqual(first.attempts.map((a) => a.provider), ['flaky', 'dead', 'good']);
  assert.equal(first.attempts[0].status, 503);
  assert.ok(first.attempts[1].error);
  assert.equal(first.usage.total_tokens, 7);
  assert.ok(lines.length >= 6);
});

test('rejects bad config early', () => {
  assert.throws(() => normalizeConfig({ providers: {}, models: { x: ['ghost/m'] } }), /unknown provider "ghost"/);
});

test('example config is valid', () => {
  const cfg = loadConfig(new URL('../router.config.example.json', import.meta.url));
  assert.ok(Object.keys(cfg.models).length >= 1);
});
