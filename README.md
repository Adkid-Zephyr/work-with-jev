# Work with Jev · 工作消息分类器

**工作群消息太多？用 Jev 挑出需要你处理的事，整理成一份跨群待办。**

[English README](README.en.md) · [飞书接入](docs/FEISHU.md) · [企业微信接入](docs/WECOM.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Adkid-Zephyr/work-with-jev/pulls)
[![Checks](https://github.com/Adkid-Zephyr/work-with-jev/actions/workflows/test.yml/badge.svg)](https://github.com/Adkid-Zephyr/work-with-jev/actions/workflows/test.yml)

---

## 这是什么

工作群刷了几百条消息。有人催你确认方案，有人分享资料，还有几十条“收到”。逐条翻，浪费时间；全部忽略，又怕漏掉自己的事。

Work with Jev 是一个在自己电脑运行的消息分类器。告诉它**你是谁、负责什么**，它用 Jev 辅助判断消息该放在哪一类。

> **先找到需要你处理的事，再决定哪些值得看。**

重要消息加入待办，拖动安排顺序，做完打勾。切换群聊后，已经整理好的事项仍然保留。

## 分完之后是什么样

| 群里的消息 | 整理到哪里 | 你可以做什么 |
| --- | --- | --- |
| “客户正在等，麻烦现在确认脚本。” | 紧急处理 | 打开原消息，优先回复 |
| “周五前整理好下期选题。” | 我的待办 | 加入跨群队列，完成后打勾 |
| “这份收音指南，这次拍摄可以参考。” | 值得一看 | 需要时展开阅读 |
| “收到 👍” | 暂时略过 | 默认折叠，减少干扰 |

以上是场景示意，不是准确率评测。**同一条消息，对不同的人，重要程度可能不同。** 分类可以人工纠正，原文始终保留。

## 快速开始

需要 **Node.js 22.9+** 和 npm。

```bash
git clone https://github.com/Adkid-Zephyr/work-with-jev.git
cd work-with-jev
npm ci
npm start
```

打开 **http://127.0.0.1:4173**。macOS 用户安装后也可以双击 `Start.command`。

### 先看演示

不用注册、不用密钥。用内置消息体验四类看板、身份切换、手动分类和待办管理。

**演示使用标注清楚的预设结果。** 想测试真实模型，在「设置」填写 [TypeSafe API Key](https://console.typesafe.ai/keys)，再点「分类」。发送前可核对消息，调用会消耗你的 API 额度。

### 再接上自己的消息

| 来源 | 目前接收范围 | 接入方法 |
| --- | --- | --- |
| 飞书 | 用户授权可读取的所选群消息 | [官方 CLI 配置与登录](docs/FEISHU.md) |
| 企业微信 | 私聊智能机器人、群内 @机器人的消息 | [Bot ID / 长连接 Secret 配置](docs/WECOM.md) |

企业微信入口不等于任意群聊全量读取，也不包含连接前的完整历史。真实连接需要你自己的凭证和平台权限。

## 功能速览

- **分类**：紧急、待办、值得看、暂时略过；条数可选 1–200，默认 50。
- **阅读**：紧凑预览、点开全文、低优先级折叠；飞书有定位链接时可跳回原消息。
- **管理**：手动纠正、跨群待办、拖动排序、勾选完成与撤销。
- **保存**：刷新保留已整理的信息；系统入群通知自动过滤。
- **控制**：读取消息与调用模型分开，不自动回复或执行工作任务。

## 为什么用 Jev

这一步需要的是几个判断：**跟我有关吗？需要我行动吗？紧急吗？有参考价值吗？**

Jev 返回这些判断的概率，代码将结果放进四列。不需要先生成一段长回复，再从回复里解析分类。最终如何处理，由你决定。

概率不是正确率保证，默认阈值还需在自己的消息上检验。[数据存储、分批上下文与使用限制](docs/USAGE.md)。

## 扩展与贡献

消息接入与分类逻辑分开实现。欢迎修复问题，或贡献钉钉、Slack 等新来源的适配器。

[贡献指南](CONTRIBUTING.md) · [接入扩展指南](docs/EXTENDING.md) · [反馈问题](https://github.com/Adkid-Zephyr/work-with-jev/issues/new/choose) · [复制为自己的项目](https://github.com/Adkid-Zephyr/work-with-jev/generate)

```text
work-with-jev/
├── dist/                 中文交互界面
├── lib/core.mjs          消息处理与分类规则
├── lib/providers/        飞书、企业微信与扩展模板
├── server.mjs            本地服务与 Jev 调用
├── tests/                离线回归测试
└── docs/                 接入指南与评测记录
```

开发检查：`npm run check`、`npm test`。已有[浏览器交互评测](docs/qa/REVIEW.md)与[维护续接记录](docs/qa/SESSION.md)；离线测试不等于真实平台或模型验证。

## 致谢与 License

基于 [TypeSafe / Jev](https://docs.typesafe.ai/introduction)、[飞书 CLI](https://github.com/larksuite/cli) 和 [企业微信 SDK](https://github.com/WecomTeam/aibot-node-sdk)。演示叙事参考 [Jev Ultrafast](https://github.com/browser-use/jev-ultrafast)，未复用其代码或速度数据。

<a href="https://docs.typesafe.ai/introduction"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/typesafe-dark.png"><img src="docs/assets/typesafe-light.png" alt="TypeSafe AI" width="120"></picture></a>

应用代码采用 [MIT](LICENSE)，允许按条款使用、修改和商用。Jev 模型与 API 是外部服务，不包含在开源范围内。本项目独立开发，不代表官方背书；[Logo 来源与归属](docs/assets/ATTRIBUTION.md)。
