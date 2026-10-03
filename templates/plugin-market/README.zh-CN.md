# __SLUG__

**几秒内找到 __PLATFORM__ 插件或技能，一键复制安装命令。**

[English](README.md) | [简体中文](README.zh-CN.md)

**浏览：** https://__OWNER__.github.io/__SLUG__/

![screenshot](docs/screenshot.png)

## 为什么

__PLATFORM__ 插件散落在各个 GitHub 仓库、推文和群聊中，安装命令往往藏在 README 深处。本项目是一个可搜索的静态页面，直接给出可粘贴的安装命令。无后端、无需登录。

## 提交插件

编辑 `registry.json`，在 PR 中添加一条记录。CI 会自动校验必填字段、id 与仓库唯一性、分类以及安装命令安全性。

```bash
npm test
npm start
```

## 许可证

MIT
