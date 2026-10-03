# __SLUG__

**在 macOS、Windows 和 Linux 上用独立桌面窗口运行 __PLATFORM__，内置真实终端，直接调用官方 CLI。**

[English](README.md) | [简体中文](README.zh-CN.md)

![screenshot](docs/screenshot.png)

**下载：** [最新版本](__REPO_URL__/releases/latest)（`.dmg`、`.exe`、`.AppImage`、`.deb`）

## 为什么

__PLATFORM__ 是命令行工具，很多用户并不习惯终端。本应用提供独立窗口和配置文件，在完整终端模拟器 (xterm.js + node-pty) 中原样运行官方 CLI，颜色、确认提示和快捷键与终端中完全一致。

## 使用

1. 先安装官方 __PLATFORM__ CLI。
2. 打开应用，点击 **Config**（Cmd/Ctrl+,），设置 `command`。
3. 点击 **Restart**（Cmd/Ctrl+R）。Cmd/Ctrl+N 打开新窗口。

也可用环境变量 `AGENT_CMD` 覆盖配置。

## 从源码构建

```bash
npm install
npm start
npm run dist
```

## 许可证

MIT
