# __SLUG__

**在 macOS、Windows 和 Linux 上用独立桌面窗口运行 __PLATFORM__，内置真实终端，直接调用官方 CLI。**

[English](README.md) | [简体中文](README.zh-CN.md)

<!-- TODO before posting: put a real screenshot at docs/screenshot.png (real app, real output, under 3 MB). -->
![screenshot](docs/screenshot.png)

**下载：** [最新版本](__REPO_URL__/releases/latest)（`.dmg` 仅支持 Apple 芯片 Mac、`.exe`、`.AppImage`、`.deb`）

**首次打开：** 安装包未使用付费证书签名，系统会提示一次。
- macOS 15 及以上：打开应用，在提示框点 **完成**，再到 系统设置 > 隐私与安全性，点击应用旁的 **仍要打开** 并确认。右键打开已无法跳过提示。也可执行一次 `xattr -dr com.apple.quarantine "/Applications/__PLATFORM__ Desktop.app"`。
- Windows：SmartScreen 提示时点 **更多信息**，再点 **仍要运行**。

## 为什么

__PLATFORM__ 是命令行工具，很多用户并不习惯终端。本应用提供独立窗口和配置文件，在完整终端模拟器 (xterm.js + node-pty) 中原样运行官方 CLI，颜色、确认提示和快捷键与终端中完全一致。

## 使用

1. 先安装官方 __PLATFORM__ CLI。
2. 打开应用，点击 **Config**（Cmd/Ctrl+,），设置 `command`。
3. 点击 **Restart**（Cmd/Ctrl+R）。Cmd/Ctrl+N 打开新窗口。

也可用环境变量 `AGENT_CMD` 覆盖配置。从访达或程序坞打开时，应用会读取登录 shell 的 `PATH`；若仍找不到命令，请把 `command` 设为完整路径（`command -v <cli>` 可查看）。

## 从源码构建

```bash
npm install
npm start
npm run dist
```

## 许可证

MIT。非官方项目，与 __PLATFORM__ 官方无关。
