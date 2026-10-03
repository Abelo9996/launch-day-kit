# __SLUG__

**Run __PLATFORM__ in its own desktop window on macOS, Windows and Linux, with the real CLI in a real terminal.**

<!-- zh:start -->
[English](README.md) | [简体中文](README.zh-CN.md)
<!-- zh:end -->

![screenshot](docs/screenshot.png)

**Download:** [latest release](__REPO_URL__/releases/latest) (`.dmg`, `.exe`, `.AppImage`, `.deb`)

## Why

__PLATFORM__ ships as a terminal tool. Plenty of people who want it do not live in a terminal, and people who do still lose it among twenty tabs. This app gives it a dock icon, its own window and a config file, and runs the official CLI unchanged inside a full terminal emulator (xterm.js + node-pty), so colors, prompts, approvals and keyboard shortcuts behave exactly as they do in your terminal.

## Use it

1. Install the official __PLATFORM__ CLI and make sure it runs in your terminal.
2. Open the app, click **Config** (Cmd/Ctrl+,) and set `command`, for example:

```json
{
  "title": "__PLATFORM__",
  "command": "your-agent-cli",
  "args": [],
  "cwd": "~/code",
  "env": {}
}
```

3. Click **Restart** (Cmd/Ctrl+R). Cmd/Ctrl+N opens another window with its own session.

`AGENT_CMD="your-agent-cli --flag"` overrides the config file. With no command set, the app opens your login shell.

## Build from source

```bash
git clone __REPO_URL__ && cd __SLUG__
npm install
npm start          # dev run
npm test           # unit tests + launches the app headless and checks pty output reaches xterm
npm run dist       # installers for the current OS into release/
```

Push a tag like `v0.1.0` and `.github/workflows/release.yml` builds mac, Windows and Linux installers and attaches them to a GitHub release. Builds are unsigned until you add signing secrets, so macOS users need right-click, Open on first launch.

<!-- zh:start -->
## 中文

见 [README.zh-CN.md](README.zh-CN.md)。
<!-- zh:end -->

## License

MIT
