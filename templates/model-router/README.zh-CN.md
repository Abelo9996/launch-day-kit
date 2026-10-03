# __SLUG__

**任何兼容 OpenAI 的客户端只需一个地址，即可使用 __PLATFORM__ 模型，并自动回退到其他服务商。**

[English](README.md) | [简体中文](README.zh-CN.md)

![demo](docs/demo.gif)

```bash
npx github:__OWNER__/__SLUG__ --config router.config.json
```

## 为什么

新模型发布时通常只在一个平台上线，前几天经常限流，随后才出现在其他平台，且模型 ID 各不相同。而你的工具只能填一个 `base_url`。本项目零依赖、纯 Node 实现。

- 每个模型别名一条配置，按顺序回退
- 超时、连接错误、408/409/429 和 5xx 自动切换到下一个服务商；其他 4xx 直接返回
- 流式输出 (SSE) 原样透传
- 每个请求写一行 JSONL 日志：每次尝试、状态码、延迟、token 用量

## 快速开始

```bash
git clone __REPO_URL__ && cd __SLUG__
cp router.config.example.json router.config.json
npm start
```

然后在任意 OpenAI SDK 中把 base URL 设为 `http://127.0.0.1:8787/v1`。

## 一行添加新模型

```json
"models": {
  "new-model": ["official/new-model-2026", "openrouter/vendor/new-model"]
}
```

## 许可证

MIT
