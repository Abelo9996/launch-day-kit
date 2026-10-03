import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { resolveTargets } from './config.mjs';
import { createLogger } from './log.mjs';

const ROUTED = new Set(['/v1/chat/completions', '/v1/completions', '/v1/embeddings', '/v1/responses']);
const MAX_BODY = 20 * 1024 * 1024;

// Retry on the next target for these upstream statuses. Other 4xx go back to the caller.
export function shouldFallback(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function errorBody(message, type = 'router_error') {
  return { error: { message, type } };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('request body too large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createRouter(cfg, { log = createLogger(cfg.log), env = process.env, fetchImpl = fetch } = {}) {
  const inboundKey = env.ROUTER_API_KEY || '';

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true });

    if (inboundKey && req.headers.authorization !== `Bearer ${inboundKey}`) {
      return send(res, 401, errorBody('missing or wrong bearer token', 'auth_error'));
    }

    if (req.method === 'GET' && url.pathname === '/v1/models') {
      const data = Object.keys(cfg.models).map((id) => ({ id, object: 'model', owned_by: 'router' }));
      return send(res, 200, { object: 'list', data });
    }

    if (req.method !== 'POST' || !ROUTED.has(url.pathname)) {
      return send(res, 404, errorBody(`no route for ${req.method} ${url.pathname}`, 'not_found'));
    }

    const id = randomUUID();
    const started = Date.now();
    const entry = { ts: new Date().toISOString(), id, path: url.pathname, model: null, stream: false, attempts: [] };
    const finish = (status, extra = {}) => log({ ...entry, status, ms: Date.now() - started, ...extra });

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      finish(e.status || 400, { error: e.message });
      return send(res, e.status || 400, errorBody(e.status ? e.message : 'body must be JSON', 'invalid_request_error'));
    }
    entry.model = body.model;
    entry.stream = Boolean(body.stream);

    const targets = resolveTargets(cfg, body.model);
    if (!targets.length) {
      finish(404, { error: 'unknown model' });
      return send(res, 404, errorBody(`unknown model "${body.model}". Known: ${Object.keys(cfg.models).join(', ')}`, 'invalid_request_error'));
    }

    let last = null;
    for (const t of targets) {
      const provider = cfg.providers[t.provider];
      const attempt = { provider: t.provider, model: t.model };
      const t0 = Date.now();
      const headers = { 'content-type': 'application/json', ...(provider.headers || {}) };
      const key = provider.apiKeyEnv ? env[provider.apiKeyEnv] : provider.apiKey;
      if (key) headers.authorization = `Bearer ${key}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), provider.timeoutMs || cfg.timeoutMs);
      try {
        const upstream = await fetchImpl(provider.baseUrl + url.pathname.replace(/^\/v1/, ''), {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, model: t.model }),
          signal: ctrl.signal,
        });
        attempt.status = upstream.status;
        attempt.ms = Date.now() - t0;
        entry.attempts.push(attempt);
        if (shouldFallback(upstream.status) && t !== targets[targets.length - 1]) {
          last = { status: upstream.status, text: await upstream.text().catch(() => '') };
          clearTimeout(timer);
          continue;
        }
        const outHeaders = {
          'content-type': upstream.headers.get('content-type') || 'application/json',
          'x-router-provider': t.provider,
          'x-router-model': t.model,
          'x-router-request-id': id,
        };
        if (entry.stream && upstream.ok && upstream.body) {
          res.writeHead(upstream.status, { ...outHeaders, 'cache-control': 'no-cache' });
          const stream = Readable.fromWeb(upstream.body);
          stream.on('error', () => res.destroy());
          stream.pipe(res);
          await new Promise((r) => res.on('close', r));
          clearTimeout(timer);
          finish(upstream.status, { provider: t.provider });
          return;
        }
        const text = await upstream.text();
        clearTimeout(timer);
        let usage;
        try { usage = JSON.parse(text).usage; } catch {}
        res.writeHead(upstream.status, outHeaders);
        res.end(text);
        finish(upstream.status, { provider: t.provider, usage });
        return;
      } catch (e) {
        clearTimeout(timer);
        attempt.error = e.name === 'AbortError' ? 'timeout' : e.message;
        attempt.ms = Date.now() - t0;
        entry.attempts.push(attempt);
        last = { status: 502, text: attempt.error };
      }
    }
    finish(502, { error: 'all targets failed' });
    send(res, 502, errorBody(`all ${targets.length} targets failed; last: ${last?.status} ${String(last?.text).slice(0, 200)}`, 'upstream_error'));
  }

  return (req, res) => {
    handle(req, res).catch((e) => {
      if (!res.headersSent) send(res, 500, errorBody(e.message));
      else res.destroy();
    });
  };
}

export function createServer(cfg, opts) {
  return createHttpServer(createRouter(cfg, opts));
}
