# launch-day-kit

Private toolkit for shipping a companion repo within hours of an AI platform launch.

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

```bash
node bin/new-launch.mjs --platform "Qwen 4" --slug awesome-qwen4 --template awesome-list --out ../awesome-qwen4 --zh
cd ../awesome-qwen4 && npm install && npm test
gh repo create <owner>/awesome-qwen4 --public --source . --push --description "Curated list of Qwen 4 tools, clients and guides."
```

Flags: `--owner` (default `$LAUNCH_OWNER` or `Abelo9996`), `--date YYYY-MM-DD`, `--zh` (keep EN/ZH files), `--no-git`, `--list`.

Placeholders in templates: `__PLATFORM__`, `__SLUG__`, `__OWNER__`, `__REPO_URL__`, `__DATE__`, `__YEAR__`. They also work in file names. `<!-- zh:start -->...<!-- zh:end -->` blocks are dropped without `--zh`.

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
- **desktop-shell**: config unit tests, node-pty spawn, then launches the real Electron app headless (`xvfb-run` on Linux) and waits until pty output appears in the xterm.js buffer.
- **plugin-market**: registry validation (including unsafe install commands), search and install-command logic, build, then serves `dist/` and fetches the page and registry.
- **model-router**: fake upstreams; fallback on 5xx and connection errors, no fallback on 4xx, SSE passthrough, `/v1/models`, JSONL log contents.

CI (`.github/workflows/ci.yml`) runs the kit tests plus the rehearsal for each template on Ubuntu, and desktop-shell and tui-wrapper again on macOS. `.github/workflows/package-desktop.yml` builds unsigned desktop-shell installers on macOS, Windows and Linux whenever that template changes (or on manual dispatch).

## Maintenance

- Template dependency versions are pinned. Bump them, run `npm run rehearse`, commit the lockfiles.
- `npm run check` fails on en/em dashes anywhere, attribution boilerplate in templates, and absolute home paths.
