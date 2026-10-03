#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { loadConfig } from '../src/config.mjs';
import { createServer } from '../src/server.mjs';

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log('Usage: __SLUG__ [--config router.config.json] [--port 8787]');
  process.exit(0);
}
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const path = flag('--config') || process.env.ROUTER_CONFIG || (existsSync('router.config.json') ? 'router.config.json' : 'router.config.example.json');
const cfg = loadConfig(path);
if (flag('--port')) cfg.port = Number(flag('--port'));

createServer(cfg).listen(cfg.port, cfg.host, () => {
  console.log(`__SLUG__ listening on http://${cfg.host}:${cfg.port}/v1 (config: ${path})`);
  console.log(`models: ${Object.keys(cfg.models).join(', ')}`);
  if (cfg.log) console.log(`request log: ${cfg.log}`);
});
