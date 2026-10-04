# __SLUG__

**Point any OpenAI-compatible client at one URL and use __PLATFORM__ models with automatic fallback to other providers.**

<!-- zh:start -->
[English](README.md) | [简体中文](README.zh-CN.md)
<!-- zh:end -->

<!-- TODO before posting: put a real recording at docs/demo.gif (real app, real output, under 3 MB). -->
![demo](docs/demo.gif)

```bash
npx github:__OWNER__/__SLUG__ --init   # writes router.config.json here; edit providers and model IDs
npx github:__OWNER__/__SLUG__
```

## Why

New models launch on one provider, get rate limited for days, and show up on two or three others with different model IDs. Your tools only take one `base_url`. LiteLLM solves this but brings a Python stack and a database; this is one Node file tree with zero dependencies.

- One config entry per model alias, with an ordered fallback list
- Falls through on timeouts, connection errors, 408/409/429 and 5xx; other 4xx go straight back to you
- Streaming (SSE) passed through untouched
- One JSONL log line per request: every attempt, status, latency, token usage
- `provider/model` works without any config entry
- `timeoutMs` is how long to wait for a provider to start answering; a started stream runs as long as it keeps sending, and is cut after `timeoutMs` of silence

## Quick start

```bash
git clone __REPO_URL__ && cd __SLUG__
npm start -- --init                                # writes router.config.json; edit providers and model IDs
export PLATFORM_API_KEY=...                        # whatever apiKeyEnv names
npm start
```

Then use `http://127.0.0.1:8787/v1` as the base URL in any OpenAI SDK, editor plugin or agent:

```bash
curl http://127.0.0.1:8787/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"__SLUG__-default","messages":[{"role":"user","content":"hello"}]}'
```

## Add a model in one line

```json
"models": {
  "new-model": ["official/new-model-2026", "openrouter/vendor/new-model", "local/new-model:q4"]
}
```

Targets are tried left to right. Providers are declared once with `baseUrl` and `apiKeyEnv` (the env var that holds the key).

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/responses` | routed by `model` |
| GET | `/v1/models` | configured aliases |
| GET | `/healthz` | liveness |

Set `ROUTER_API_KEY` to require `Authorization: Bearer <key>` on inbound requests.

## Logs

`logs/requests.jsonl`, one object per request:

```json
{"ts":"__DATE__T12:00:00.000Z","model":"__SLUG__-default","attempts":[{"provider":"official","status":429,"ms":180},{"provider":"openrouter","status":200,"ms":950}],"status":200,"usage":{"total_tokens":512}}
```

<!-- zh:start -->
## 中文

见 [README.zh-CN.md](README.zh-CN.md)。
<!-- zh:end -->

## License

MIT. Unofficial; not affiliated with the vendor of __PLATFORM__.
