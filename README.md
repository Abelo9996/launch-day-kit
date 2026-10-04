# launch-day-kit

![launch-day-kit scaffolding a model-router repo for a fake platform, then installing it and passing all 10 of its tests in seconds](docs/demo.gif)

Ship a companion repo within hours of an AI platform launch: a playbook plus five tested templates (awesome-list, terminal UI, desktop app, plugin market, model router) and a one-command scaffolder.

## What's here

| Path | What |
| --- | --- |
| `PLAYBOOK.md` | T-minus / T-plus checklist, naming rules, README pattern, where to post, kill rule, calendar |
| `bin/new-launch.mjs` | Scaffolder. Zero dependencies. Copies a template, fills placeholders, runs `git init` and an initial commit |
| `templates/awesome-list` | List skeleton, CONTRIBUTING, PR template, format + link check workflow. Zero deps |
| `templates/tui-wrapper` | Ink terminal UI around any CLI agent command: sessions, scrollback, keybindings |
| `templates/desktop-shell` | Electron + xterm.js + node-pty app running a configurable CLI agent; mac/win/linux release workflow |
| `templates/plugin-market` | Static searchable catalog from `registry.json`, copy-install buttons, PR validation, GitHub Pages deploy. Zero deps |
| `templates/model-router` | OpenAI-compatible proxy with per-model fallback chains and JSONL request logs. Zero deps |
| `scripts/rehearse.mjs` | Scaffolds every template with a fake platform, installs, runs its smoke test, checks it is publishable, times it |
| `REHEARSAL.md` | Latest rehearsal timings and the manual steps left per template |

Every template ships MIT `LICENSE`, `README.md` following the playbook pattern, optional `README.zh-CN.md`, and its own CI.

## Launch day

Needs Node 22+ and git. `gh` (logged in) is optional but saves typing your GitHub user. Not on npm; use it from a clone:

```bash
git clone https://github.com/Abelo9996/launch-day-kit && cd launch-day-kit
node bin/new-launch.mjs --platform "Qwen 4" --slug awesome-qwen4 --template awesome-list --out ../awesome-qwen4 --zh
cd ../awesome-qwen4 && npm install && npm test
```

The scaffolder prints every stand-in the template ships (example entries, `your-agent-cli`, placeholder model IDs, the demo image path) as `file:lines`. Replace them, then:

```bash
node ../launch-day-kit/bin/new-launch.mjs --check .   # exit 0 when nothing from the template is left
git add -A && git commit -m "Fill in for launch"
gh repo create <owner>/awesome-qwen4 --public --source . --push --description "Curated list of Qwen 4 tools, clients and guides."
```

[PLAYBOOK.md](PLAYBOOK.md) has the per-template list of what to replace and the timeline around it.

Flags: `--owner` (default `$LAUNCH_OWNER`, else your `gh` login, else `git config github.user`; if none is set the scaffolder stops and says so), `--author` (LICENSE holder, default `git config user.name`, else the owner), `--date YYYY-MM-DD`, `--zh` (keep EN/ZH files), `--no-git`, `--list`, `--check <dir>`.

If git has no `user.name`/`user.email`, the scaffolder runs `git init` but leaves the first commit to you, so the repo is not pushed under an identity git made up from your login and host name.

Placeholders in templates: `__PLATFORM__`, `__SLUG__`, `__OWNER__`, `__AUTHOR__`, `__REPO_URL__`, `__DATE__`, `__YEAR__`. They also work in file names. `<!-- zh:start -->...<!-- zh:end -->` blocks are dropped without `--zh`.

## Rehearse

```bash
npm test                          # scaffolder tests + repo text checks
npm run rehearse                  # all templates, temp dir, prints timings
node scripts/rehearse.mjs --only desktop-shell --keep    # one template, keep output
npm run rehearse:write            # refresh the table in REHEARSAL.md
```

Do a rehearsal before any expected launch and after bumping template dependencies.

## Template smoke tests

Each scaffolded repo runs `npm test`:

- **awesome-list**: list format, contents vs sections, duplicate links, anchors and local links. `npm run links:online` fetches every URL.
- **tui-wrapper**: renders the UI with ink-testing-library, types a prompt, runs a fake agent, checks streamed output, exit codes, session switching.
- **desktop-shell**: config unit tests, node-pty spawn, then launches the real Electron app headless (`xvfb-run` on Linux) and waits until pty output appears in the xterm.js buffer; a second launch uses the minimal `PATH` a Finder or Dock launch gets and checks the agent command is still found through the login shell.
- **plugin-market**: registry validation (including unsafe install commands), search and install-command logic, build, then serves `dist/` and fetches the page and registry.
- **model-router**: fake upstreams; fallback on 5xx and connection errors, no fallback on 4xx, SSE passthrough, streams longer than `timeoutMs`, stalled streams, client disconnects, `/v1/models`, JSONL log contents, CLI errors.

CI (`.github/workflows/ci.yml`) runs the kit tests plus the rehearsal for each template on Ubuntu, and desktop-shell and tui-wrapper again on macOS. `.github/workflows/package-desktop.yml` builds unsigned desktop-shell installers on macOS, Windows and Linux whenever that template changes (or on manual dispatch), and on macOS verifies the ad-hoc signature and runs the packaged app.

## Maintenance

- Template dependency versions are pinned. Bump them, run `npm run rehearse`, commit the lockfiles.
- `npm run check` fails on en/em dashes anywhere, attribution boilerplate in templates, and absolute home paths.
