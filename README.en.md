# Work with Jev · Work message classifier

**Too many work messages? Use Jev to find what needs you, then keep it in one cross-chat task queue.**

[中文 README](README.md) · [Feishu setup](docs/FEISHU.md) · [WeCom setup](docs/WECOM.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Adkid-Zephyr/work-with-jev/pulls)
[![Checks](https://github.com/Adkid-Zephyr/work-with-jev/actions/workflows/test.yml/badge.svg)](https://github.com/Adkid-Zephyr/work-with-jev/actions/workflows/test.yml)

---

## What is this?

Your work chats have hundreds of messages. Someone needs your approval, someone shared a useful guide, and dozens of people said “got it.” Reading everything costs time; ignoring everything risks missing your part.

Work with Jev runs on your computer. Describe **who you are and what you do**, then let Jev help sort the messages.

> **Find what needs your attention, then choose what is worth reading.**

Add important messages to a task queue, drag to reorder, and check them off. Switching chats preserves the work you have already organized.

## What the result looks like

| Message | Category | Next step |
| --- | --- | --- |
| “The client is waiting. Please confirm the script now.” | Urgent | Open the original and respond |
| “Prepare next week's topic list by Friday.” | My tasks | Add to your cross-chat queue |
| “This audio guide might help with our shoot.” | Worth reading | Expand when needed |
| “Got it 👍” | Skip for now | Collapsed by default |

These are illustrative scenarios, not measured accuracy results. **The same message can matter differently to different people.** You can correct categories and read the original text.

## Quick start

Requires **Node.js 22.9+** and npm.

```bash
git clone https://github.com/Adkid-Zephyr/work-with-jev.git
cd work-with-jev
npm ci
npm start
```

Open **http://127.0.0.1:4173**. On macOS, you can also double-click `Start.command` after installation.

### Try the demo

No account or key is needed. Built-in messages demonstrate the board, identities, manual classification, and task queue. The UI is currently Chinese.

**Demo results are clearly labeled presets.** For real inference, enter a [TypeSafe API key](https://console.typesafe.ai/keys) in Settings and click Classify. Review the batch before transmission; API calls use your credit.

### Connect your messages

| Source | Supported access | Setup |
| --- | --- | --- |
| Feishu | Selected chat messages available to the authorized user | [Official CLI setup](docs/FEISHU.md) |
| WeCom | Direct messages to a smart bot and group @mentions | [Bot ID / long-connection Secret](docs/WECOM.md) |

WeCom bot access does not include arbitrary group messages or full pre-connection history. Live use requires your own credentials and platform permissions. Detailed setup guides are currently in Chinese.

## Features

- **Classify:** urgent, tasks, useful, or skip; select 1–200 messages, default 50.
- **Read:** compact previews, full-text details, collapsed low-priority messages, and official Feishu deep links when available.
- **Manage:** correct categories, collect tasks across chats, reorder, complete, and undo completion.
- **Retain:** organized items survive page reloads; system membership notices are filtered.
- **Control:** fetching and model inference are separate. No automatic replies or execution of work tasks.

## Why Jev?

This step needs a few judgments: **Is it relevant to me? Does it require action? Is it urgent? Is it useful?**

Jev returns probabilities for those judgments. Code assigns the categories without first generating a long answer and parsing it. You control the final action.

Probabilities are not accuracy guarantees. Validate the initial thresholds on your own messages. See [storage, batching, and limitations](docs/USAGE.md). Browser state uses localStorage; WeCom additionally keeps a bounded local inbox. Keys entered through Settings remain in server memory and must be re-entered after restart unless configured in `.env`.

## Extend and contribute

Message providers are separate from classification logic. Contributions can fix issues or add providers such as DingTalk and Slack.

[Contributing](CONTRIBUTING.md) · [Provider guide](docs/EXTENDING.md) · [Report an issue](https://github.com/Adkid-Zephyr/work-with-jev/issues/new/choose) · [Use this template](https://github.com/Adkid-Zephyr/work-with-jev/generate)

```text
work-with-jev/
├── dist/                 Chinese UI
├── lib/core.mjs          Message handling and classification
├── lib/providers/        Feishu, WeCom, and adapter template
├── server.mjs            Local service and Jev requests
├── tests/                Offline regression tests
└── docs/                 Setup guides and review records
```

Run `npm run check` and `npm test`. See the [browser interaction review](docs/qa/REVIEW.md) and [maintenance handoff](docs/qa/SESSION.md). Offline tests do not establish live platform or model performance.

## Credits and license

Built on [TypeSafe / Jev](https://docs.typesafe.ai/introduction), [Lark CLI](https://github.com/larksuite/cli), and the [WeCom SDK](https://github.com/WecomTeam/aibot-node-sdk). The task-to-result presentation was inspired by [Jev Ultrafast](https://github.com/browser-use/jev-ultrafast); no code or performance figures were copied.

<a href="https://docs.typesafe.ai/introduction"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/typesafe-dark.png"><img src="docs/assets/typesafe-light.png" alt="TypeSafe AI" width="120"></picture></a>

Application code is under [MIT](LICENSE). Jev's model and API remain external services. This is an independent project without implied vendor endorsement. [Logo attribution](docs/assets/ATTRIBUTION.md).
