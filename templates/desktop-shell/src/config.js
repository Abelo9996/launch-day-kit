const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DEFAULT_CONFIG = {
  title: '__PLATFORM__',
  // Set to the agent CLI, e.g. "your-agent-cli". Empty means the login shell.
  command: '',
  args: [],
  cwd: '~',
  env: {},
  fontSize: 14,
  fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
};

function splitCommand(str) {
  const out = [];
  let cur = '';
  let quote = null;
  let has = false;
  for (const ch of str) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; }
    else if (ch === '"' || ch === "'") { quote = ch; has = true; }
    else if (/\s/.test(ch)) { if (cur || has) out.push(cur); cur = ''; has = false; }
    else cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

function defaultShell(platform = process.platform, env = process.env) {
  if (platform === 'win32') return env.COMSPEC || 'powershell.exe';
  return env.SHELL || '/bin/sh';
}

function expandHome(p) {
  return p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p;
}

function loadConfig(configPath, env = process.env) {
  let cfg = { ...DEFAULT_CONFIG };
  if (configPath && fs.existsSync(configPath)) {
    try {
      cfg = { ...cfg, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch (e) {
      cfg.configError = `${configPath}: ${e.message}`;
    }
  }
  if (env.AGENT_CMD) {
    const [command, ...args] = splitCommand(env.AGENT_CMD);
    cfg = { ...cfg, command, args };
  }
  return cfg;
}

// Turn config into what node-pty.spawn needs.
function resolveLaunch(cfg, platform = process.platform, env = process.env) {
  const command = cfg.command || defaultShell(platform, env);
  const usingShell = !cfg.command;
  return {
    file: command,
    args: usingShell ? [] : cfg.args || [],
    cwd: expandHome(cfg.cwd || '~'),
    env: { ...env, ...cfg.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    usingShell,
  };
}

function writeDefaultConfig(configPath) {
  if (fs.existsSync(configPath)) return false;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
  return true;
}

module.exports = { DEFAULT_CONFIG, splitCommand, defaultShell, loadConfig, resolveLaunch, writeDefaultConfig, expandHome };
