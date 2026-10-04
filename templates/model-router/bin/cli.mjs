#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig, missingKeys } from '../src/config.mjs';
import { createServer } from '../src/server.mjs';

const EXAMPLE = fileURLToPath(new URL('../router.config.example.json', import.meta.url));
const args = process.argv.slice(2);
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (args.includes('-h') || args.includes('--help')) {
  console.log(`Usage: __SLUG__ [--config router.config.json] [--port 8787]
       __SLUG__ --init     write router.config.json here from the example, then edit it

Config lookup: --config, $ROUTER_CONFIG, ./router.config.json`);
  process.exit(0);
}
if (args.includes('--init')) {
  if (existsSync('router.config.json')) die('router.config.json already exists here; edit it or delete it first.');
  copyFileSync(EXAMPLE, 'router.config.json');
  console.log('Wrote router.config.json. Set real provider baseUrl values and model IDs, export the apiKeyEnv variables, then run again without --init.');
  process.exit(0);
}
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const path = flag('--config') || process.env.ROUTER_CONFIG || 'router.config.json';
if (!existsSync(path)) {
  die(`No config at ${path}.\nCreate one with:  __SLUG__ --init   (or npx github:__OWNER__/__SLUG__ --init)\nor point to one:  --config <file>`);
}
let cfg;
try {
  cfg = loadConfig(path);
} catch (e) {
  die(`Could not load ${path}: ${e.message}`);
}
if (flag('--port')) cfg.port = Number(flag('--port'));
for (const m of missingKeys(cfg)) console.warn(`warning: ${m}`);

const server = createServer(cfg);
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') die(`Port ${cfg.port} on ${cfg.host} is already in use. Stop the other process or pass --port <n>.`);
  die(`Server error: ${e.message}`);
});
server.listen(cfg.port, cfg.host, () => {
  console.log(`__SLUG__ listening on http://${cfg.host}:${cfg.port}/v1 (config: ${path})`);
  console.log(`models: ${Object.keys(cfg.models).join(', ')}`);
  if (cfg.log) console.log(`request log: ${cfg.log}`);
});
