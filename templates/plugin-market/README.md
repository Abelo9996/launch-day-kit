# __SLUG__

**Find a __PLATFORM__ plugin or skill in seconds and copy its install command in one click.**

<!-- zh:start -->
[English](README.md) | [简体中文](README.zh-CN.md)
<!-- zh:end -->

**Browse:** https://__OWNER__.github.io/__SLUG__/

<!-- TODO before posting: put a real screenshot at docs/screenshot.png (real app, real output, under 3 MB). -->
![screenshot](docs/screenshot.png)

## Why

__PLATFORM__ plugins are scattered across GitHub repos, tweets and Discord threads, and each README buries the install line. This is one searchable page with the exact command to paste. No backend, no accounts: a static site that reads `registry.json`.

## Add a plugin

Edit `registry.json` and open a PR with one new entry:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "One sentence on what it does for the agent.",
  "author": "your-github-handle",
  "repo": "https://github.com/you/my-plugin",
  "category": "Tools",
  "tags": ["search"],
  "added": "__DATE__"
}
```

`install` is optional. Without it the command is built from `installTemplate` in `registry.json`. CI validates every PR: required fields, unique id and repo, known category, https links, and install commands with no `;`, `&&`, pipes, backticks or `$(`.

```bash
npm test        # validate + build + smoke test
npm start       # preview at http://127.0.0.1:4173/
```

## Deploy

Settings, Pages, Source: **GitHub Actions**. Every push to `main` runs `.github/workflows/pages.yml` and publishes `dist/`.

<!-- zh:start -->
## 中文

见 [README.zh-CN.md](README.zh-CN.md)。
<!-- zh:end -->

## License

MIT. Unofficial; not affiliated with the vendor of __PLATFORM__.
