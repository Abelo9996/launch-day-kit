import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const APP = '__SLUG__';

export const DEFAULTS = {
  title: '__PLATFORM__',
  // The agent command. "{prompt}" and "{session}" are substituted per run.
  // If no arg contains {prompt}, the prompt is written to the process's stdin.
  command: 'echo',
  args: ['{prompt}'],
  cwd: '.',
  env: {},
  stateFile: join(homedir(), `.${APP}`, 'sessions.json'),
  maxLines: 5000,
};

// Split a command string on whitespace, honoring simple single/double quotes.
export function splitCommand(str) {
  const out = [];
  let cur = '';
  let quote = null;
  let has = false;
  for (const ch of str) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

export function loadConfig({ argv = [], env = process.env, cwd = process.cwd() } = {}) {
  let cfg = { ...DEFAULTS };
  const candidates = [
    argv.includes('--config') ? argv[argv.indexOf('--config') + 1] : null,
    env.AGENT_TUI_CONFIG,
    join(cwd, `${APP}.config.json`),
    join(homedir(), '.config', APP, 'config.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) {
      cfg = { ...cfg, ...JSON.parse(readFileSync(p, 'utf8')), configPath: p };
      break;
    }
  }
  if (env.AGENT_CMD) {
    const [command, ...args] = splitCommand(env.AGENT_CMD);
    cfg = { ...cfg, command, args };
  }
  const dd = argv.indexOf('--');
  if (dd >= 0 && argv.length > dd + 1) {
    const [command, ...args] = argv.slice(dd + 1);
    cfg = { ...cfg, command, args };
  }
  return cfg;
}

export function buildInvocation(cfg, prompt, sessionId) {
  const sub = (s) => s.split('{prompt}').join(prompt).split('{session}').join(sessionId);
  const usesPrompt = cfg.args.some((a) => a.includes('{prompt}'));
  return {
    command: cfg.command,
    args: cfg.args.map(sub),
    stdin: usesPrompt ? null : prompt + '\n',
    cwd: cfg.cwd,
    env: { ...process.env, ...cfg.env },
  };
}
