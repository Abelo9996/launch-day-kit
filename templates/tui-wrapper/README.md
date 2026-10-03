# __SLUG__

**A terminal UI for __PLATFORM__ with a session list, scrollback and keybindings, wrapped around the official CLI.**

<!-- zh:start -->
[English](README.md) | [简体中文](README.zh-CN.md)
<!-- zh:end -->

![demo](docs/demo.gif)

```bash
npx github:__OWNER__/__SLUG__ -- your-agent-cli -p {prompt}
```

## Why

The stock __PLATFORM__ CLI prints one long scroll per run and forgets which conversation was which. This keeps several sessions side by side, shows which one is still running, and lets you stop a run without killing your terminal. It wraps the official binary, so new CLI flags work the day they ship.

```
╭ Sessions ──────────╮╭ __PLATFORM__ | fix the flaky test | running ─────────╮
│ > 1 fix the flaky  ││ > fix the flaky test                                │
│   2 write docs     ││ reading tests/api.test.ts ...                       │
╰────────────────────╯╰─────────────────────────────────────────────────────╯
╭ > type a prompt, enter to send ───────────────────────────────────────────╮
 enter send  tab next session  ctrl+n new  ctrl+x stop  ctrl+d delete  pgup/pgdn scroll  ctrl+c quit
```

## Configure the command

Any of these, first match wins:

1. Arguments after `--`: `__SLUG__ -- agent -p {prompt}`
2. `AGENT_CMD="agent --session {session}"` (no `{prompt}`, so the prompt goes to stdin)
3. `./__SLUG__.config.json` or `~/.config/__SLUG__/config.json` (see `__SLUG__.config.example.json`)

`{prompt}` is replaced with what you typed. `{session}` is a stable ID per session, so agents that take a session or resume flag keep context across turns.

## Keys

| Key | Action |
| --- | --- |
| enter | send prompt |
| tab / shift+tab | next / previous session |
| ctrl+n | new session |
| ctrl+x | stop the running command |
| ctrl+d | delete session |
| pgup / pgdn | scroll output |
| esc | clear input |
| ctrl+c | quit |

Sessions are saved to `~/.__SLUG__/sessions.json`.

## Develop

```bash
npm install
npm run demo    # runs against a fake agent
npm test
```

<!-- zh:start -->
## 中文

见 [README.zh-CN.md](README.zh-CN.md)。
<!-- zh:end -->

## License

MIT
