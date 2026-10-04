import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as http } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { missingKeys, normalizeConfig } from '../src/config.mjs';
import { createServer } from '../src/server.mjs';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let up, router, base, logPath;
let upstreamClosedEarly = false;

before(async () => {
  // Streams 8 chunks 60 ms apart (about 480 ms in total), or stalls after one chunk.
  up = http(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    const { model } = JSON.parse(raw);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.on('close', () => { if (!res.writableFinished) upstreamClosedEarly = true; });
    const n = model === 'stall' ? 1 : 8;
    for (let i = 0; i < n && !res.destroyed; i++) {
      res.write(`data: {"i":${i}}\n\n`);
      await sleep(60);
    }
    if (model === 'stall') return; // never ends
    res.end('data: [DONE]\n\n');
  });
  logPath = join(mkdtempSync(join(tmpdir(), 'router-stream-')), 'req.jsonl');
  const cfg = normalizeConfig({
    log: logPath,
    timeoutMs: 200,
    providers: { p: { baseUrl: (await listen(up)) + '/v1' } },
    models: {},
  });
  router = createServer(cfg, { env: {} });
  base = await listen(router);
});

after(() => { up.closeAllConnections(); up.close(); router.closeAllConnections(); router.close(); });

const post = (model, signal) => fetch(base + '/v1/chat/completions', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model, stream: true, messages: [] }),
  signal,
});
const logFor = (model) => readFileSync(logPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((l) => l.model === model);

test('a stream longer than timeoutMs is not cut while it keeps sending', async () => {
  const text = await (await post('p/long')).text();
  assert.equal((text.match(/data: \{"i"/g) || []).length, 8);
  assert.match(text, /\[DONE\]/);
  await sleep(20);
  assert.equal(logFor('p/long')[0].error, undefined);
});

test('a stalled stream is cut after timeoutMs of silence and logged as cut', async () => {
  const text = await (await post('p/stall')).text().catch(() => 'aborted');
  assert.doesNotMatch(text, /\[DONE\]/);
  await sleep(50);
  assert.match(logFor('p/stall')[0].error, /stream cut: upstream idle timeout/);
});

test('a client that disconnects mid-stream aborts the upstream request', async () => {
  upstreamClosedEarly = false;
  const ctrl = new AbortController();
  const r = await post('p/abandoned', ctrl.signal);
  const reader = r.body.getReader();
  await reader.read();
  ctrl.abort();
  await sleep(150);
  assert.equal(upstreamClosedEarly, true);
  assert.match(logFor('p/abandoned')[0].error, /client closed/);
});

test('missingKeys names providers whose key variable is unset', () => {
  const cfg = normalizeConfig({ providers: { a: { baseUrl: 'http://x', apiKeyEnv: 'A_KEY' }, b: { baseUrl: 'http://y' } }, models: {} });
  assert.deepEqual(missingKeys(cfg, {}), ['provider "a": A_KEY is not set, requests to it will be sent without a key']);
  assert.deepEqual(missingKeys(cfg, { A_KEY: 'k' }), []);
});
