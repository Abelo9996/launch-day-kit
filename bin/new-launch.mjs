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
  node bin/new-launch.mjs --check <dir>

Options:
  --platform <name>   Display name of the launched platform, e.g. "DeepSeek Harness"
  --slug <slug>       Repo name, lowercase and hyphenated, e.g. deepseek-harness-desktop
  --template <name>   One of: ${listTemplates().join(', ')}
  --out <dir>         Target directory (must not exist or must be empty)
  --owner <user>      GitHub user or org for repo URLs (default: $LAUNCH_OWNER, else your gh login,
                      else git config github.user)
  --author <name>     Copyright holder in LICENSE (default: git config user.name, else the owner)
  --date <YYYY-MM-DD> Launch date written into files (default: today, UTC)
  --zh                Keep bilingual EN/ZH files and README language switcher
  --no-git            Do not run git init / initial commit
  --list              List templates and exit
  --check <dir>       List what is still example content in a scaffolded repo; exit 1 if anything is left
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
      case '--author': opts.author = next(); break;
      case '--check': opts.check = next(); break;
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

const quiet = (cmd, args, run = execFileSync) => {
  try {
    return run(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return '';
  }
};

export const OWNER_HELP = `Could not work out your GitHub user for the repo URLs, LICENSE and install lines.
Pass it explicitly:   --owner <github-user-or-org>
or set it once:       export LAUNCH_OWNER=<github-user-or-org>
or log in to gh:      gh auth login`;

// Owner for repo URLs when --owner and $LAUNCH_OWNER are unset: the logged-in gh user,
// then git's github.user setting. Returns '' when neither is available.
export function detectOwner(run = execFileSync) {
  for (const [cmd, args] of [['gh', ['api', 'user', '--jq', '.login']], ['git', ['config', '--get', 'github.user']]]) {
    const out = quiet(cmd, args, run);
    if (/^[A-Za-z0-9-]+$/.test(out)) return out;
  }
  return '';
}

export function placeholders(opts, run = execFileSync) {
  const owner = opts.owner || process.env.LAUNCH_OWNER || detectOwner(run);
  if (!owner) throw new Error(OWNER_HELP);
  if (!/^[A-Za-z0-9-]+$/.test(owner)) throw new Error(`--owner "${owner}" is not a GitHub user or org name`);
  const date = opts.date || new Date().toISOString().slice(0, 10);
  return {
    __PLATFORM__: opts.platform,
    __SLUG__: opts.slug,
    __OWNER__: owner,
    __AUTHOR__: opts.author || quiet('git', ['config', '--get', 'user.name'], run) || owner,
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
  // Dropping a zh block can leave a run of blank lines behind.
  return out.replace(/\n{3,}/g, '\n\n');
}

// Things a template ships as stand-ins. Each one has to be replaced before the repo goes public.
const TODO_RULES = [
  [/your-github-user/, 'owner placeholder: re-scaffold with --owner <you>'],
  [/\bexample\.com\b|github\.com\/example\//, 'example entry or link: replace with a real one or delete it'],
  [/your-agent-cli/, 'stand-in command: put the real CLI command of the platform here'],
  [/"[a-z]+\/(vendor\/)?model-name"/, 'stand-in model ID: put real provider model IDs here'],
];
const CHECK_SKIP = new Set([...SKIP_DIRS, 'test', 'scripts', 'site', 'src', '.github']);

export function checkRepo(dir) {
  const root = resolve(dir);
  if (!existsSync(root)) throw new Error(`--check ${root} does not exist`);
  const todos = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (!CHECK_SKIP.has(name)) visit(p);
        continue;
      }
      if (name === 'package-lock.json' || !TEXT_EXT.has(extname(name).toLowerCase())) continue;
      const rel = relative(root, p);
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        for (const [re, what] of TODO_RULES) if (re.test(line)) todos.push(`${rel}:${i + 1}  ${what}`);
        if (/\.md$/.test(name)) {
          for (const m of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
            if (!/^https?:/.test(m[1]) && !existsSync(join(dirname(p), m[1]))) {
              todos.push(`${rel}:${i + 1}  ${m[1]} does not exist yet: add it (real app, real output) or delete the image line`);
            }
          }
        }
      });
    }
  };
  visit(root);
  return todos;
}

// "README.md:23  msg", "README.md:24  msg" -> "README.md:23,24  msg"
export function groupTodos(todos) {
  const groups = new Map();
  for (const t of todos) {
    const m = t.match(/^(.*?):(\d+)  (.*)$/);
    const key = `${m[1]}\u0000${m[3]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m[2]);
  }
  return [...groups].map(([key, lines]) => {
    const [file, what] = key.split('\u0000');
    return `${file}:${lines.join(',')}  ${what}`;
  });
}

const shortPath = (p) => {
  const rel = relative(process.cwd(), p) || '.';
  return rel.split(/[\\/]/).filter((x) => x === '..').length > 2 ? p : rel;
};

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
  const vars = placeholders(opts);
  mkdirSync(out, { recursive: true });
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
      // Without a configured identity git invents one from the login and host name, which
      // would then be pushed publicly. Leave the commit to the user instead.
      const email = process.env.GIT_AUTHOR_EMAIL || quiet('git', ['-C', out, 'config', '--get', 'user.email']);
      if (!email) throw Object.assign(new Error('no identity'), { identity: true });
      try {
        execFileSync('git', ['commit', '-q', '-m', `Initial ${opts.template} for ${opts.platform}`], { cwd: out, stdio: 'pipe' });
        git = 'committed';
      } catch {
        git = 'initialized (commit skipped: set git user.name and user.email)';
      }
    } catch (e) {
      git = e.identity
        ? 'initialized, not committed: set git config --global user.name and user.email, then git commit -m "Initial commit"'
        : `failed: ${e.message}`;
    }
  }
  return { out, files: written.length, git, vars, todos: checkRepo(out) };
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
  if (opts.check) {
    try {
      const todos = checkRepo(opts.check);
      if (!todos.length) {
        console.log('Nothing left from the template. Review the README once more, then push.');
        return;
      }
      console.log(`${todos.length} thing(s) to replace before going public:\n  ${groupTodos(todos).join('\n  ')}`);
      process.exit(1);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
  const started = Date.now();
  try {
    const r = scaffold(opts);
    const here = shortPath(r.out);
    console.log(`Scaffolded ${opts.template} -> ${r.out}`);
    console.log(`  files: ${r.files}  git: ${r.git}  repo: ${r.vars.__REPO_URL__}  (${Date.now() - started} ms)`);
    console.log(`Next:\n  cd ${here}\n  npm install && npm test`);
    if (r.todos.length) {
      console.log(`  replace ${r.todos.length} stand-in(s) from the template (file:lines):\n    ${groupTodos(r.todos).join('\n    ')}`);
      console.log(`  node ${fileURLToPath(import.meta.url)} --check .   (re-run until it is clean)`);
    }
    console.log(`  git add -A && git commit -m "Fill in for launch"`);
    console.log(`  gh repo create ${r.vars.__OWNER__}/${opts.slug} --public --source . --push --description "<one plain sentence with ${opts.platform} in it>"`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
