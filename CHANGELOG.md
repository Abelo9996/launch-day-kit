# Changelog

## 0.1.1 (2026-10-04)

Kit
- Generated `LICENSE` files named the kit's author. They now use `--author`, else `git config user.name`, else the GitHub owner.
- The scaffolder stops with instructions when it cannot work out the GitHub owner (no `--owner`, no `$LAUNCH_OWNER`, `gh` not logged in, no `github.user`), instead of writing `your-github-user` into every URL.
- With no git identity configured, the scaffolder no longer commits under one git invents from the login and host name.
- New `--check <dir>`: lists every stand-in still in a scaffolded repo (example entries, `your-agent-cli`, placeholder model IDs, missing demo image). The scaffolder prints the same list after scaffolding, plus the commit and `gh repo create` lines.
- Generated READMEs: demo image placeholders carry a TODO comment, every README ends with the not-affiliated line, no runs of blank lines without `--zh`.
- PLAYBOOK: concrete per-template replace-and-check table, exact push, topic, Pages and tag commands, honest macOS first-launch expectation.

Templates
- model-router: streams were cut at `timeoutMs` (60 s by default) even while tokens were flowing, and logged as 200. `timeoutMs` now bounds the wait for an answer and stream silence; cuts are logged. Client disconnects abort the upstream request. Clear CLI errors for a missing or broken config and a busy port, `--init` to write a config, and a startup warning for unset API key variables.
- desktop-shell: opened from Finder, the Dock or a launcher, the app could not find CLIs installed with Homebrew, npm or pipx. It now reads `PATH` from the login shell, and a missing command shows a message instead of a bare exit 1.
- desktop-shell: the release workflow ad-hoc signs unsigned macOS builds (they were reported as "damaged" on Apple Silicon), passes signing secrets through when set, and verifies the signature. README explains the first-launch steps on macOS 15+ and Windows. Lockfile updated past a high-severity advisory.
- tui-wrapper: text and Enter arriving in one chunk (paste, fast typing) is sent instead of leaving a stray carriage return in the input; a hint shows when no agent command is configured.
- plugin-market: the preview server no longer crashes on a malformed URL; inline favicon.
- awesome-list: community link points to Issues (Discussions is off on new repos and failed the online link check).
