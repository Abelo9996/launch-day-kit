# Rehearsal

Goal: under 30 minutes from scaffold to a publishable repo, per template.

"Publishable" here means: scaffolded with a fake platform name ("Zephyr Agent 2"), dependencies installed, the template's own `npm test` passing, no placeholders left, no en/em dashes, LICENSE present, headline under the title, ZH README present, initial git commit made. The rehearsal script checks all of that.

## Machine time (measured)

Warm caches (npm and Electron already cached on this machine):

<!-- timings:start -->
Run 2026-10-03 08:46 UTC, node v22.22.2, darwin-arm64, platform "Zephyr Agent 2", zh on.

| Template | Result | Scaffold | Install | Smoke test | Total (machine time) |
| --- | --- | --- | --- | --- | --- |
| awesome-list | pass | 44 ms | 0 ms | 280 ms | 335 ms |
| desktop-shell | pass | 50 ms | 1.2 s | 1.4 s | 2.7 s |
| model-router | pass | 49 ms | 0 ms | 327 ms | 388 ms |
| plugin-market | pass | 48 ms | 0 ms | 352 ms | 410 ms |
| tui-wrapper | pass | 49 ms | 639 ms | 925 ms | 1.6 s |
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
