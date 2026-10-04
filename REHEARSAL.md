# Rehearsal

Goal: under 30 minutes from scaffold to a publishable repo, per template.

"Publishable" here means: scaffolded with a fake platform name ("Zephyr Agent 2"), dependencies installed, the template's own `npm test` passing, no placeholders left, no en/em dashes, LICENSE with a copyright line for this year, headline under the title, ZH README present, initial git commit made. The rehearsal script checks all of that. It also prints how many stand-ins (example entries, `your-agent-cli`, placeholder model IDs, demo image) are left for a human to replace; `node bin/new-launch.mjs --check <dir>` lists them.

## Machine time (measured)

Warm caches (npm and Electron already cached on this machine):

<!-- timings:start -->
Run 2026-10-04 03:42 UTC, node v22.22.2, darwin-arm64, platform "Zephyr Agent 2", zh on.

| Template | Result | Scaffold | Install | Smoke test | Total (machine time) |
| --- | --- | --- | --- | --- | --- |
| awesome-list | pass | 65 ms | 0 ms | 360 ms | 438 ms |
| desktop-shell | pass | 75 ms | 2.0 s | 4.2 s | 6.3 s |
| model-router | pass | 167 ms | 0 ms | 1.7 s | 1.8 s |
| plugin-market | pass | 119 ms | 0 ms | 512 ms | 645 ms |
| tui-wrapper | pass | 96 ms | 1.2 s | 1.5 s | 2.8 s |
<!-- timings:end -->

Cold caches (empty npm cache and Electron download cache):

Run 2026-10-03 08:47 UTC, node v22.22.2, darwin-arm64, platform "Zephyr Agent 2", zh on.

| Template | Result | Scaffold | Install | Smoke test | Total (machine time) |
| --- | --- | --- | --- | --- | --- |
| awesome-list | pass | 43 ms | 0 ms | 282 ms | 337 ms |
| desktop-shell | pass | 53 ms | 1.8 s | 5.6 s | 7.5 s |
| model-router | pass | 45 ms | 0 ms | 322 ms | 379 ms |
| plugin-market | pass | 50 ms | 0 ms | 357 ms | 418 ms |
| tui-wrapper | pass | 48 ms | 670 ms | 1.0 s | 1.8 s |

GitHub Actions, run 37110888825 (cold runners, includes `npm ci`):

| Template | Runner | Scaffold | Install | Smoke test | Total |
| --- | --- | --- | --- | --- | --- |
| awesome-list | ubuntu-latest | 28 ms | 0 ms | 445 ms | 479 ms |
| tui-wrapper | ubuntu-latest | 23 ms | 2.2 s | 1.4 s | 3.7 s |
| tui-wrapper | macos-latest | 60 ms | 2.2 s | 1.2 s | 3.5 s |
| desktop-shell | ubuntu-latest (xvfb, node-pty compiled) | 32 ms | 13.8 s | 4.5 s | 18.3 s |
| desktop-shell | macos-latest | 53 ms | 2.3 s | 3.4 s | 5.8 s |
| plugin-market | ubuntu-latest | 27 ms | 0 ms | 562 ms | 596 ms |
| model-router | ubuntu-latest | 22 ms | 0 ms | 336 ms | 362 ms |

Desktop installers (`package-desktop` workflow, run 37110960757, unsigned): macOS `.dmg` + `.zip` in 43 s, Linux `.AppImage` + `.deb` in 2 m 13 s, Windows NSIS `.exe` + `.zip` in 6 m 24 s.

## Human time (estimated, not measured)

What is left after the script, per template. These are estimates for planning, to be replaced with real numbers after the first live launch.

| Template | Manual steps before going public | Estimate |
| --- | --- | --- |
| awesome-list | Real headline; replace example entries with 10 to 20 real ones; fix contents if sections change; `gh repo create` | 15 to 25 min |
| tui-wrapper | Set the real CLI command in README and example config; try it against the real CLI once; record GIF with `vhs`; push | 15 to 25 min |
| desktop-shell | Set default command hint in README; run `npm start` against the real CLI; screenshot; push; tag `v0.1.0` (release builds take about 10 to 15 min in Actions and run in parallel with posting) | 20 to 30 min to public repo, release follows |
| plugin-market | Real `installTemplate`, categories and 5+ real entries; push; enable Pages (Source: GitHub Actions) | 15 to 25 min |
| model-router | Real provider base URLs and model IDs in the example config; one live request; push | 10 to 20 min |

All five fit the 30 minute goal on paper. The desktop-shell release (installers) lands after the repo is public; the playbook target for that is +12 h, which leaves plenty of slack.

## Notes from this rehearsal

- desktop-shell: Electron 44 downloads its binary lazily on first run, so the first smoke test after a cold install includes a roughly 100 MB download.
- desktop-shell: node-pty 1.1.0 ships `spawn-helper` without the executable bit on macOS; the template's `postinstall` (`scripts/fix-pty.js`) restores it. Without it every spawn fails with `posix_spawnp failed`.
- desktop-shell: node-pty has no Linux prebuilds, so Linux installs compile it (needs python3, make, g++; present on GitHub Ubuntu runners).
- desktop-shell: `electron-builder --dir` packaging was also verified on macOS arm64, and the packaged app passed the same smoke check.
- plugin-market: the built page was also loaded in a headless Chromium (Electron) to confirm search, category chips, hash state and copy commands render with no console errors.
