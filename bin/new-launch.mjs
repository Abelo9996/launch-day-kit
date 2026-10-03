#!/usr/bin/env node
// Scaffold a launch-day companion repo from one of the templates in ../templates.
// Zero dependencies: node:fs, node:path, node:child_process only.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = resolve(HERE, '..', 'templates');

const TEXT_EXT = new Set([
  '.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.html', '.css', '.yml', '.yaml',
  '.txt', '.toml', '.sh', '.example', '',
]);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'release', '.git', 'logs']);
const ZH_FILE = /\.zh-CN\.md$/;
const ZH_BLOCK = /[ \t]*<!-- zh:start -->[\s\S]*?<!-- zh:end -->[ \t]*\r?\n?/g;

const USAGE = `Usage:
  node bin/new-launch.mjs --platform "<Name>" --slug <slug> --template <name> --out <dir> [options]

Options:
  --platform <name>   Display name of the launched platform, e.g. "DeepSeek Harness"
  --slug <slug>       Repo name, lowercase and hyphenated, e.g. deepseek-harness-desktop
  --template <name>   One of: ${listTemplates().join(', ')}
  --out <dir>         Target directory (must not exist or must be empty)
  --owner <user>      GitHub owner for the repo URL (default: $LAUNCH_OWNER or Abelo9996)
  --date <YYYY-MM-DD> Launch date written into files (default: today, UTC)
  --zh                Keep bilingual EN/ZH files and README language switcher
  --no-git            Do not run git init / initial commit
  --list              List templates and exit
  -h, --help          Show this help`;

export function listTemplates() {
  if (!existsSync(TEMPLATES_DIR)) return [];
  return readdirSync(TEMPLATES_DIR).filter((d) => statSync(join(TEMPLATES_DIR, d)).isDirectory()).sort();
}

export function parseArgs(argv) {
  const opts = { zh: false, git: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--platform': opts.platform = next(); break;
      case '--slug': opts.slug = next(); break;
      case '--template': opts.template = next(); break;
      case '--out': opts.out = next(); break;
      case '--owner': opts.owner = next(); break;
      case '--date': opts.date = next(); break;
      case '--zh': opts.zh = true; break;
      case '--no-git': opts.git = false; break;
      case '--list': opts.list = true; break;
      case '-h': case '--help': opts.help = true; break;
      default: throw new Error(`Unknown argument: ${a}`);
    }
  }
  return opts;
}

export function validate(opts) {
  const errors = [];
  if (!opts.platform) errors.push('--platform is required');
  if (!opts.slug) errors.push('--slug is required');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opts.slug)) errors.push('--slug must be lowercase letters/digits separated by single hyphens');
  if (!opts.template) errors.push('--template is required');
  else if (!listTemplates().includes(opts.template)) errors.push(`unknown template "${opts.template}" (have: ${listTemplates().join(', ')})`);
  if (!opts.out) errors.push('--out is required');
  if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) errors.push('--date must be YYYY-MM-DD');
  return errors;
}

export function placeholders(opts) {
  const owner = opts.owner || process.env.LAUNCH_OWNER || 'Abelo9996';
  const date = opts.date || new Date().toISOString().slice(0, 10);
  return {
    __PLATFORM__: opts.platform,
    __SLUG__: opts.slug,
    __OWNER__: owner,
    __REPO_URL__: `https://github.com/${owner}/${opts.slug}`,
    __DATE__: date,
    __YEAR__: date.slice(0, 4),
  };
}

export function render(text, vars, zh) {
  let out = text;
  if (!zh) out = out.replace(ZH_BLOCK, '');
  else out = out.replace(/[ \t]*<!-- zh:(start|end) -->[ \t]*\r?\n?/g, '');
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, files);
    } else files.push(p);
  }
  return files;
}

export function scaffold(opts) {
  const errors = validate(opts);
  if (errors.length) throw new Error(errors.join('\n'));
  const src = join(TEMPLATES_DIR, opts.template);
  const out = resolve(opts.out);
  if (existsSync(out) && readdirSync(out).length) throw new Error(`--out ${out} exists and is not empty`);
  mkdirSync(out, { recursive: true });

  const vars = placeholders(opts);
  const written = [];
  for (const file of walk(src)) {
    const rel = relative(src, file);
    if (!opts.zh && ZH_FILE.test(rel)) continue;
    const dest = join(out, rel.split('__SLUG__').join(opts.slug));
    mkdirSync(dirname(dest), { recursive: true });
    const ext = extname(file).toLowerCase();
    const isText = TEXT_EXT.has(ext) || basename(file).startsWith('.');
    if (isText) {
      writeFileSync(dest, render(readFileSync(file, 'utf8'), vars, opts.zh));
      const mode = statSync(file).mode;
      if (mode & 0o111) execFileSync('chmod', ['+x', dest]);
    } else {
      cpSync(file, dest);
    }
    written.push(rel);
  }

  // A template may ship `gitignore` (npm strips .gitignore on publish); rename it.
  const gi = join(out, 'gitignore');
  if (existsSync(gi) && !existsSync(join(out, '.gitignore'))) {
    writeFileSync(join(out, '.gitignore'), readFileSync(gi));
    rmSync(gi);
  }

  let git = 'skipped';
  if (opts.git) {
    try {
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: out });
      execFileSync('git', ['add', '-A'], { cwd: out });
      try {
        execFileSync('git', ['commit', '-q', '-m', `Initial ${opts.template} for ${opts.platform}`], { cwd: out, stdio: 'pipe' });
        git = 'committed';
      } catch {
        git = 'initialized (commit skipped: set git user.name and user.email)';
      }
    } catch (e) {
      git = `failed: ${e.message}`;
    }
  }
  return { out, files: written.length, git, vars };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message + '\n\n' + USAGE);
    process.exit(2);
  }
  if (opts.help) { console.log(USAGE); return; }
  if (opts.list) { console.log(listTemplates().join('\n')); return; }
  const started = Date.now();
  try {
    const r = scaffold(opts);
    console.log(`Scaffolded ${opts.template} -> ${r.out}`);
    console.log(`  files: ${r.files}  git: ${r.git}  repo: ${r.vars.__REPO_URL__}  (${Date.now() - started} ms)`);
    console.log(`Next:\n  cd ${r.out}\n  npm install && npm test\n  gh repo create ${r.vars.__OWNER__}/${opts.slug} --public --source . --push`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
