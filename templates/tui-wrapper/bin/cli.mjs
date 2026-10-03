#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from '../src/app.mjs';
import { loadConfig } from '../src/config.mjs';
import { fileStore } from '../src/sessions.mjs';

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
  console.log(`Usage: __SLUG__ [--config file.json] [-- <agent command> [args with {prompt} and {session}]]

Examples:
  __SLUG__ -- my-agent -p {prompt}
  AGENT_CMD="my-agent --session {session}" __SLUG__     (prompt goes to stdin)

Config lookup: --config, $AGENT_TUI_CONFIG, ./__SLUG__.config.json, ~/.config/__SLUG__/config.json`);
  process.exit(0);
}
const config = loadConfig({ argv });
if (!process.stdin.isTTY) {
  console.error('__SLUG__ needs an interactive terminal.');
  process.exit(1);
}
render(React.createElement(App, { config, store: fileStore(config.stateFile) }));
