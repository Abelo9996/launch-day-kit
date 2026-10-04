import { readFileSync } from 'node:fs';

// A target is "provider/upstream-model". The upstream model may itself contain slashes.
export function parseTarget(target) {
  const i = target.indexOf('/');
  if (i <= 0 || i === target.length - 1) throw new Error(`Bad target "${target}", expected "provider/model"`);
  return { provider: target.slice(0, i), model: target.slice(i + 1) };
}

export function normalizeConfig(raw) {
  const cfg = {
    port: 8787,
    host: '127.0.0.1',
    timeoutMs: 60000,
    log: 'logs/requests.jsonl',
    providers: {},
    models: {},
    ...raw,
  };
  const errors = [];
  for (const [name, p] of Object.entries(cfg.providers)) {
    if (!p || typeof p.baseUrl !== 'string') errors.push(`provider "${name}" needs a baseUrl`);
    else p.baseUrl = p.baseUrl.replace(/\/+$/, '');
  }
  const models = {};
  for (const [alias, targets] of Object.entries(cfg.models)) {
    const list = Array.isArray(targets) ? targets : [targets];
    if (!list.length) errors.push(`model "${alias}" has no targets`);
    models[alias] = list.map((t) => {
      try {
        const parsed = parseTarget(t);
        if (!cfg.providers[parsed.provider]) errors.push(`model "${alias}" uses unknown provider "${parsed.provider}"`);
        return parsed;
      } catch (e) {
        errors.push(e.message);
        return null;
      }
    });
  }
  if (errors.length) throw new Error('Invalid router config:\n  ' + errors.join('\n  '));
  cfg.models = models;
  return cfg;
}

export function loadConfig(path) {
  return normalizeConfig(JSON.parse(readFileSync(path, 'utf8')));
}

// Providers whose apiKeyEnv is not set. Requests to them go out without a key and usually
// come back 401, which does not fall through to the next target.
export function missingKeys(cfg, env = process.env) {
  return Object.entries(cfg.providers)
    .filter(([, p]) => p.apiKeyEnv && !env[p.apiKeyEnv])
    .map(([name, p]) => `provider "${name}": ${p.apiKeyEnv} is not set, requests to it will be sent without a key`);
}

// Resolve a requested model to an ordered list of {provider, model} targets.
// Unknown aliases of the form "provider/model" are passed straight through.
export function resolveTargets(cfg, requested) {
  if (cfg.models[requested]) return cfg.models[requested];
  try {
    const t = parseTarget(requested);
    if (cfg.providers[t.provider]) return [t];
  } catch {}
  return [];
}
