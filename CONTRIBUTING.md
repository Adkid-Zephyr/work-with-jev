# 参与 Work with Jev / Contributing

欢迎修复问题、改善中文交互、完善文档，或贡献新的办公软件适配器。

## 开始开发 / Getting started

```bash
npm ci
npm start
npm run check
npm test
```

需要 Node.js 22.9+。示例模式和自动测试不需要 API Key；真实飞书与 Jev 测试使用你自己的账号和授权。

Requires Node.js 22.9+. Preset demos and automated tests require no API keys. Live integrations use your own authorized accounts.

## 提交改动 / Pull requests

1. Fork 本仓库，为改动创建分支。
2. 保持改动聚焦；说明解决的问题、前后行为和验证结果。
3. 行为变更补充能覆盖实际回归的测试，运行以上检查。
4. 新平台接入参见 [扩展指南](docs/EXTENDING.md)，明确支持的读取范围及所需权限。

Fork the repository, create a branch, and submit a focused PR describing the problem, behavior change, and validation. Add regression tests for behavioral changes. Follow the provider guide for new integrations and document access boundaries.

不要提交密钥、授权链接、二维码、真实群聊记录或个人标识。请使用虚构示例；真实模型结果与预设结果必须区分。

Never commit credentials, authorization links, QR codes, real chat logs, or personal identifiers. Use synthetic fixtures and distinguish preset results from live inference.

## 反馈问题 / Reporting issues

请提供系统、Node.js 版本、复现步骤、预期与实际行为。可附脱敏截图。界面问题不需要附上聊天原文，模型问题请尽量提供最小虚构案例。

Include your OS, Node.js version, reproduction steps, expected/actual behavior, and redacted screenshots if useful. Prefer minimal synthetic examples over private messages.

项目源代码以 MIT 许可发布；第三方品牌素材的归属见 [素材说明](docs/assets/ATTRIBUTION.md)。
