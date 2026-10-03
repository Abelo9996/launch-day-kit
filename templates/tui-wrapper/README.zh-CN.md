# __SLUG__

**__PLATFORM__ 终端界面：会话列表、滚动回看和快捷键，基于官方 CLI 封装。**

[English](README.md) | [简体中文](README.zh-CN.md)

![demo](docs/demo.gif)

```bash
npx github:__OWNER__/__SLUG__ -- your-agent-cli -p {prompt}
```

## 为什么

官方 CLI 每次运行只输出一长串日志，也不区分会话。本工具可同时管理多个会话，显示哪个仍在运行，并可随时停止当前任务。它直接调用官方命令行，新参数发布当天即可使用。

## 配置命令

1. `--` 之后的参数：`__SLUG__ -- agent -p {prompt}`
2. 环境变量 `AGENT_CMD`（不含 `{prompt}` 时，提示词通过 stdin 传入）
3. `./__SLUG__.config.json` 或 `~/.config/__SLUG__/config.json`

`{prompt}` 替换为输入内容，`{session}` 为每个会话的固定 ID。

## 快捷键

enter 发送，tab 切换会话，ctrl+n 新建，ctrl+x 停止，ctrl+d 删除，pgup/pgdn 滚动，ctrl+c 退出。

## 许可证

MIT
