# __SLUG__

**Run __PLATFORM__ in its own desktop window on macOS, Windows and Linux, with the real CLI in a real terminal.**

<!-- zh:start -->
[English](README.md) | [简体中文](README.zh-CN.md)
<!-- zh:end -->

<!-- TODO before posting: put a real screenshot at docs/screenshot.png (real app, real output, under 3 MB). -->
![screenshot](docs/screenshot.png)

**Download:** [latest release](__REPO_URL__/releases/latest) (`.dmg` for Apple Silicon Macs, `.exe`, `.AppImage`, `.deb`)

**First launch:** the builds are not signed with a paid certificate, so the OS warns once.
- macOS 15 and later: open the app, click **Done** on the warning, then System Settings, Privacy & Security, **Open Anyway** next to the app, and confirm. Right-click, Open no longer skips the warning. Or run `xattr -dr com.apple.quarantine "/Applications/__PLATFORM__ Desktop.app"` once.
- Windows: SmartScreen says "Windows protected your PC". Click **More info**, then **Run anyway**.
- Linux: `chmod +x` the `.AppImage`, or install the `.deb`.

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

Push a tag (`git tag v0.1.0 && git push origin v0.1.0`) and `.github/workflows/release.yml` builds macOS (Apple Silicon), Windows and Linux installers and attaches them to a GitHub release, in about 10 minutes. Without signing secrets the macOS build is ad-hoc signed and not notarized, so users see the first-launch warning above. To sign and notarize, add the repo secrets `CSC_LINK` (base64 `.p12` of a Developer ID Application certificate), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`; Windows signing uses `CSC_LINK` and `CSC_KEY_PASSWORD` with a code signing certificate.

Opened from Finder, the Dock or a desktop launcher, the app reads `PATH` from your login shell so CLIs installed with Homebrew, npm or pipx are found. If yours still is not, set `command` to its full path (`command -v <cli>` prints it).

<!-- zh:start -->
## 中文

见 [README.zh-CN.md](README.zh-CN.md)。
<!-- zh:end -->

## License

MIT. Unofficial; not affiliated with the vendor of __PLATFORM__.
