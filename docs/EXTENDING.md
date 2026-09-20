# 接入其他办公软件 / Adding a message provider

分类器只需要统一的消息对象。平台鉴权、权限范围和分页留在适配器里。当前只注册 `feishu`；模板不代表已经实现企业微信或其他平台。

## Adapter contract

Implement a server-side object, following `lib/providers/feishu.mjs`:

```js
{
  id: 'my_workspace',
  name: 'My workspace',
  async status() {
    return { connected: true, name: 'Display name', openId: 'id', status: 'ready' };
  },
  async search({query}) {
    return {chats: [{id: 'chat-id', name: 'Project'}]};
  },
  async messages({chat, count = 50}) {
    return {messages: [], hasMore: false};
  }
}
```

Each normalized message uses:

```js
{
  id: 'my_workspace:message-id', // Unique across providers
  source: 'my_workspace',
  chatId: 'chat-id', group: 'Project',
  text: 'Original message text',
  sender: 'Display name', senderId: 'platform-user-id',
  time: 1790000000000, // Unix milliseconds
  threadId: '', mentions: [],
  supported: true, // false for unsupported attachments; never silently OCR
  category: null, status: 'open', starred: false
}
```

`starred` is a retained legacy data field, not an active UI feature.

## 接线步骤 / Wiring

1. Copy `lib/providers/example.mjs`, implement the platform's official authentication and read APIs. Validate count (1–200), IDs, query size, pagination and returned message types. Keep credentials server-side. Return explicit errors on unsupported access.
2. Register the object in `lib/providers/index.mjs`. The local server automatically dispatches `/api/<id>/status`, `/search`, `/messages`; requests must pass the existing local Host, Origin and nonce checks.
3. Add the source option in `dist/index.html`. In `dist/app.js`, replace Feishu-specific source selection and the three `feishu/...` API calls with the selected provider ID. Extend the current `source === 'feishu'` branches deliberately; frontend multi-provider wiring is not yet automatic.
4. Preserve separate local state per identity/provider, scope the selected messages to the chosen conversation, and show the selected batch before transmission to TypeSafe. Never let external message text choose commands or API endpoints.
5. Add fixture tests for auth failures, duplicate and recalled messages, pagination, unsupported content, and state isolation before exposing the integration.

## 企业微信 / WeCom

Choose the official access model first: direct or @bot interactions are different from organization-enabled conversation archiving. The existence of a send-message webhook does not grant read access to all chats. Platform consent, app permissions and administrator configuration remain required. This repository does not implement either path yet.

## 测试 / Testing

The Feishu factory accepts a fixed-argv `runCli` dependency. Mock it to test pagination and mapping without real credentials. Follow that pattern for future clients. Do not publish real chat transcripts in tests, recordings or bug reports.
