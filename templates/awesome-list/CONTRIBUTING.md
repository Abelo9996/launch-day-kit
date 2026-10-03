# Contributing

Thanks for adding to Awesome __PLATFORM__.

## Rules

1. One entry per pull request.
2. Format: `- [Name](https://link) - Description.` Description starts with a capital letter and ends with a period.
3. Put it at the end of the most specific section. If no section fits, say so in the PR and we will add one.
4. The project must work today with __PLATFORM__. No "coming soon" entries.
5. No duplicates. Search the list first.
6. If you are the author, say so in the PR. That is fine, it just helps review.

## Checks

CI runs `npm test`, which checks formatting, the table of contents and duplicate links. Run it locally:

```bash
npm test
npm run links:online   # optional, checks every URL over the network
```

<!-- zh:start -->
## 中文

每个 PR 只添加一条，格式为 `- [名称](链接) - 描述。`。中文条目请添加到 `README.zh-CN.md`。
<!-- zh:end -->
