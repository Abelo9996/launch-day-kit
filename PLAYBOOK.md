# Launch-day playbook

How to ship a companion repo in the first hours after a big AI platform launch. Based on what happened around launches from July to October 2026. Numbers are stars as of early October 2026.

## What the data says

| Launch | Companion | Created after launch | Stars |
| --- | --- | --- | --- |
| DeepSeek Harness (2026-08-13, 242k) | TUI | +53 min | 3.9k |
| | first desktop app | +1.8 h | 11.5k |
| | awesome-list | +2 h | 17.6k |
| | top desktop client (first release at +11.7 h) | +4.5 h | 29.8k |
| | plugin market | +17 h | 5.3k |
| | router suite | +33 h | 7k |
| | anything created after day 2 | > +48 h | 2k to 3k, then flat |
| Claude Skills | awesome-lists | day 0 to 1 | up to 76k |
| OpenClaw | skills list | day 0 | 52.9k |
| OpenClaw | "lite" clones | up to ~3 weeks | window stayed open longer |
| Kimi K3 open weights | C inference port | day 5 | 8.8k |
| Jev decision models | open replicas | day 1 to 3 | 21.7k, 29.9k |

Rules that fall out of it:

1. **The window is 0 to 48 hours.** Most of the upside is in the first 12. After day 2, even good repos stall at 2k to 3k.
2. **Shipping beats polish, but a working release beats a placeholder.** The top desktop client was not first (+4.5 h) but had a downloadable release at +11.7 h. Empty "coming soon" repos do not win.
3. **Take the brand-search name.** Winners are found by people typing the product name into GitHub search.
4. **Bilingual for Chinese-lab launches.** EN and ZH READMEs on day 0 for DeepSeek, Qwen, Kimi, GLM, MiniMax and similar.
5. **The window closes when the vendor ships that form.** If the vendor announces its own desktop app, stop building yours. Exceptions: ports to a different language/runtime (Kimi C port on day 5) and "lite" clones of heavy products, which stay open longer.

## Forms, in order of effort

| Form | Template | Typical ship time | Best when |
| --- | --- | --- | --- |
| Awesome list | `awesome-list` | 20 to 40 min | Always. Lowest effort, highest ceiling. Grows from contributors. |
| TUI wrapper | `tui-wrapper` | 30 to 60 min | Launch is a CLI agent with a plain output stream. |
| Desktop app | `desktop-shell` | 1 to 3 h to a tagged release | Launch is a CLI agent and the vendor has no desktop app. |
| Plugin / skill market | `plugin-market` | 1 to 2 h | Launch has a plugin, skill or tool format with no official directory. |
| Model router | `model-router` | 1 to 2 h | Launch is a model on several providers, or rate limits are biting. |
| Port / replica | none (custom) | days | Open weights with only a Python reference implementation. |

Pick at most two forms per launch. Awesome list plus one build.

## Before (T-minus)

Do this when nothing is launching.

- [ ] Kit cloned (`git clone https://github.com/Abelo9996/launch-day-kit`), Node 22+. `npm test` and `npm run rehearse` pass on this machine.
- [ ] Keep a watchlist with expected dates (see Calendar). For each, write down: likely brand spelling, likely repo names, which two forms you would ship.
- [ ] For launches with a known name, check GitHub for the names you want. Note fallbacks.
- [ ] Recording tool ready (`vhs` for terminal GIFs, Kap or the OS screen recorder for apps). Keep GIFs under 3 MB.
- [ ] Accounts warm: X, Hacker News, Reddit (karma above subreddit minimums), V2EX, Juejin or Zhihu for Chinese launches, relevant Discord servers.
- [ ] Draft post text per form with blanks for the name and link (see Posting).
- [ ] `gh auth status` shows you logged in (the scaffolder takes your GitHub user from it; otherwise `export LAUNCH_OWNER=<you>`). `git config --global user.name` and `user.email` are set. Actions minutes available.

## T+0 to T+2 h: claim the name, ship the first thing

- [ ] **Confirm it is real.** Official blog post, official repo or official model card. Rumors do not count.
- [ ] **Check what the vendor shipped.** If the vendor already has the form you planned (desktop app, plugin directory, list), drop that form.
- [ ] **Search GitHub** for `<brand> <form>` sorted by newest. If someone took the obvious name in the last hour with a working repo, choose a different form rather than a worse name.
- [ ] **Scaffold** (under 1 minute, from the kit directory). Add `--zh` for Chinese-lab launches:

```bash
node bin/new-launch.mjs --platform "Qwen 4" --slug awesome-qwen4 --template awesome-list --out ../awesome-qwen4 --zh
cd ../awesome-qwen4 && npm install && npm test
```

- [ ] **Replace the stand-ins.** The scaffolder prints each one as `file:lines`. Re-run `node <kit>/bin/new-launch.mjs --check .` until only the demo image is left (that one can follow by +2 h). Per template:

| Template | Replace | Then check |
| --- | --- | --- |
| awesome-list | Example entries with 10 to 20 real ones, in both READMEs | `npm test`, `npm run links:online` |
| tui-wrapper | `your-agent-cli` with the real command in README and `<slug>.config.example.json` | `node bin/cli.mjs -- <real cli> -p {prompt}` against the real CLI once |
| desktop-shell | `your-agent-cli` in README | `npm start`, set the real command in Config, run one prompt |
| plugin-market | `installTemplate` and 5+ real entries in `registry.json` | `npm start`, open http://127.0.0.1:4173/ |
| model-router | `baseUrl` and model IDs in `router.config.example.json` | `npm start -- --init`, export the key, one live `curl` (README has it) |

- [ ] **Read the headline once.** One sentence, brand name in it, what the user gets. Edit it in `README.md` (and `README.zh-CN.md`).
- [ ] **Commit, create and push public:**

```bash
git add -A && git commit -m "Fill in for launch"
gh repo create <owner>/<slug> --public --source . --push --description "<one plain sentence with the brand name>"
gh repo edit --add-topic <brand>,awesome-list,llm        # form topic: awesome-list, tui, desktop-app, plugins, llm-router
```

- [ ] **plugin-market only:** turn on Pages once: `gh api -X POST repos/<owner>/<slug>/pages -f build_type=workflow` (or Settings, Pages, Source: GitHub Actions), then re-run the `pages` workflow.
- [ ] **Post once** (X reply under the vendor's launch post, with link). Do not wait for polish.

Target: awesome-list public by +1 h, TUI by +1 h, desktop repo public by +2 h.

## T+2 to T+12 h: a working release and the demo

- [ ] **Demo GIF or screenshot on the first screen.** Real product, real output, at the `docs/` path the README already references (`--check` reports it until the file exists). This is the single biggest README lever.
- [ ] **Desktop: `git tag v0.1.0 && git push origin v0.1.0`.** The release workflow builds macOS (Apple Silicon), Windows and Linux installers in about 10 minutes. Target before +12 h. Download the `.dmg` from the release and open it yourself: expect the one-time macOS warning the README explains (Open Anyway in Privacy & Security), not a "damaged" message.
- [ ] **ZH README** if you scaffolded without `--zh`: scaffold the same template again with `--zh --no-git` into a temp dir, copy `README.zh-CN.md` over and add the `[English](README.md) | [简体中文](README.zh-CN.md)` line under the headline.
- [ ] **Answer every issue within an hour.** Early issues are your best signal and early users notice responsiveness.
- [ ] **Second round of posts** (see Posting) once there is a release or 30+ list entries.
- [ ] **Merge list PRs fast.** For awesome lists, contributor PRs are the growth engine. Merge or comment within an hour on day 0 and 1.

## T+12 to T+48 h: second form, keep shipping

- [ ] Start the second form if the first is moving (above ~100 stars by +12 h). Plugin markets landed around +17 h and routers around +33 h and still did well.
- [ ] Ship a visible update every day: release notes, new entries, fixes. A stale repo on day 2 reads as abandoned.
- [ ] Cross-link your repos (list links to your desktop app and router, and the other way around).
- [ ] Submit entries to other people's lists, including the vendor's official community list if there is one.
- [ ] Record stars at +12 h, +24 h and +48 h in your own launch notes for the kill rule.

## Week 1

- [ ] Apply the kill rule (below).
- [ ] Survivors: issue templates, a short roadmap in the README, release cadence (weekly), CONTRIBUTING.
- [ ] Watch the vendor's changelog. When they ship your form, add a note to the README pointing to the official one and move the repo to maintenance.
- [ ] Product Hunt for desktop apps that are clearly working, around day 3 to 7, not day 0.

## Kill rule

Starting values. Re-fit after three launches using the star log.

| Checkpoint | Keep going if | Otherwise |
| --- | --- | --- |
| +12 h | 100+ stars or a clear upward trend | Stop starting new forms for this launch |
| +48 h | **300+ stars** | Stop. Leave it public, no more feature work, merge PRs only if trivial |
| Day 7 | 1,000+ stars or real issue/PR traffic | Maintenance mode or archive |

The reason: repos created after day 2 stalled at 2k to 3k, and winners were in the thousands by day 2. A repo under 300 at 48 h is not on a winner's curve. Spend the time on the next launch instead.

## Naming rules

1. **Brand first, form second**: `<brand>-<form>`. Examples: `deepseek-harness-desktop`, `qwen4-router`, `kimi-k3-c`.
2. **Lists are `awesome-<brand>`**, exactly. `awesome-qwen4`, `awesome-claude-skills`. That prefix is what people search.
3. **Mirror the vendor's spelling** from their own repo or model ID. If the vendor writes `Qwen4` in IDs, use `qwen4`; if `qwen-4`, use `qwen-4`. When unsure, check what people type in the vendor's GitHub issues.
4. **Hyphenate multi-word names**, all lowercase: `deepseek-harness`, not `deepseekharness` or `DeepSeekHarness`.
5. **Plain forms**: `desktop`, `tui`, `router`, `market`, `skills`, `web`, `lite`. No cute names on day 0. You can rename later; GitHub redirects.
6. **Never imply official.** No vendor logo, no "official" in the name or description. Put "Unofficial" or "Not affiliated with <vendor>" in the README footer and the repo description where it fits.
7. **Repo description** is one plain sentence with the brand name in it, because GitHub search weights it.

## README pattern

Every template follows this. Keep it.

1. **Title** = repo name.
2. **One-sentence outcome headline** in bold: what the user gets, with the brand name. Not features, not adjectives.
3. **Language switcher** (`English | 简体中文`) for Chinese-lab launches.
4. **Demo GIF or screenshot** on the first screen. Never ship the README to a post without it after T+2 h.
5. **One-line install or download link** directly under the image.
6. **Why**: name the incumbent or the concrete problem in two to four sentences ("The stock CLI prints one long scroll per run", "LiteLLM needs a Python stack"). No hype words.
7. Usage, config, keys. Short.
8. **Bilingual section** pointing to `README.zh-CN.md`.
9. License (MIT) and the not-affiliated line.

Words to avoid in headlines and posts: revolutionary, ultimate, blazing, game-changing, powerful, seamless, "the best".

## Posting

| Where | When | What |
| --- | --- | --- |
| X | T+0 to T+2 h, then once per release | Reply under the vendor's launch post with the GIF and link. One quote post from your account. No threads of ten. |
| Hacker News | Only with a working release | `Show HN: <name>, <outcome in plain words>`. Be in the comments for the first two hours. |
| Reddit | T+2 to T+12 h | r/LocalLLaMA for open weights and routers. The vendor's subreddit if one exists. Read each sub's self-promotion rule first. |
| V2EX, Juejin, Zhihu, Linux.do | Same day, Chinese-lab launches | ZH post linking the ZH README. V2EX: 分享创造 node. |
| Vendor Discord / forum | After the first release | The show-and-tell or community-projects channel only. |
| Other awesome lists | T+12 to T+48 h | One PR each, following their format. |
| Product Hunt | Day 3 to 7 | Desktop apps only. |

Post text template:

```
<Brand> came out today. I made <form> for it: <outcome in one line>.
<link>
<GIF>
```

## Calendar (as of 2026-10-03)

| Candidate | Expected | Likely forms |
| --- | --- | --- |
| Qwen 4 | very soon | `awesome-qwen4`, `qwen4-router`, ZH required |
| Claude Sonnet / Haiku 5.5 | rumored | router entry (one config line), skills list if new skill features |
| DeepSeek V5 | unknown | router entry, desktop if it ships a new CLI, ZH required |
| Gemini 4 GA | unknown | router entry, awesome list if new agent surface |
| GitHub Universe | Oct 28 to 29 | watch for new agent/extension formats: plugin market, awesome list |
| Microsoft Ignite | Nov 17 to 20 | agent platform announcements: awesome list, TUI/desktop if a CLI ships |
| AWS re:Invent | Nov 30 to Dec 4 | agent platform/SDK: awesome list, router entry |
| NeurIPS | Dec 6 to 12 | open-weight releases timed to it: ports, routers |

Update this table when dates firm up.
