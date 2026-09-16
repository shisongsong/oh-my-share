# Oh My Share 上架 ChatGPT App Directory 实施清单

## Phase 1: Apps SDK Compatibility

### 1.1 现有 MCP Server 兼容性检查

当前 MCP endpoint: `https://openanthropic.com/mcp`

需要添加 Apps SDK 要求的资源和组件：

```javascript
// 在 src/handlers/mcp.js 中添加
const APPS_SDK_RESOURCES = [
  {
    uri: 'https://openanthropic.com/widget/upload',
    name: 'Upload Widget',
    description: 'Upload HTML files and code snippets',
    mimeType: 'text/html',
  },
  {
    uri: 'https://openanthropic.com/widget/result',
    name: 'Share Result Widget',
    description: 'Display share URL and preview',
    mimeType: 'text/html',
  },
  {
    uri: 'https://openanthropic.com/widget/assets',
    name: 'My Shares Widget',
    description: 'List and manage user shares',
    mimeType: 'text/html',
  },
];
```

### 1.2 Tool Annotations 更新

确保所有 tool 有正确的 Apps SDK annotations：

| Tool | readOnlyHint | destructiveHint | openWorldHint |
|------|--------------|-----------------|---------------|
| upload | false | false | false |
| list_assets | true | false | false |
| view | true | false | false |
| delete | false | true | false |
| get_info | true | false | false |

---

## Phase 2: ChatGPT App UI Widgets

### 2.1 创建 Widget 目录

```
src/ui/widgets/
├── upload-widget.html      # 上传组件
├── result-widget.html      # 分享结果组件
├── assets-widget.html      # 我的分享组件
└── view-widget.html        # 查看组件
```

### 2.2 Upload Widget

创建 `src/ui/widgets/upload-widget.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 像素风格样式 */
  </style>
</head>
<body>
  <div id="app">
    <h2>Share HTML</h2>
    <textarea id="content" placeholder="Paste your HTML here..."></textarea>
    <button id="shareBtn">Share</button>
  </div>
  <script>
    // ChatGPT Apps SDK Bridge
    window.addEventListener('openai:set_globals', (e) => {
      // 初始化
    });

    document.getElementById('shareBtn').addEventListener('click', async () => {
      const content = document.getElementById('content').value;
      const result = await window.openai.callTool('upload', { content });
      // 显示结果
    });
  </script>
</body>
</html>
```

### 2.3 Result Widget

创建 `src/ui/widgets/result-widget.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="app">
    <h2>Share Created!</h2>
    <div id="url"></div>
    <button id="copyBtn">Copy URL</button>
    <button id="openBtn">Open</button>
  </div>
  <script>
    window.addEventListener('openai:set_globals', (e) => {
      const data = window.openai.toolOutput;
      document.getElementById('url').textContent = data.url;
    });
  </script>
</body>
</html>
```

### 2.4 Assets Widget

创建 `src/ui/widgets/assets-widget.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="app">
    <h2>My Shares</h2>
    <div id="list"></div>
  </div>
  <script>
    async function loadAssets() {
      const result = await window.openai.callTool('list_assets', {});
      // 渲染列表
    }
    loadAssets();
  </script>
</body>
</html>
```

---

## Phase 3: OAuth 配置

### 3.1 ChatGPT OAuth 要求

ChatGPT Apps SDK 要求：
- OAuth 2.0 Authorization Code + PKCE
- 注册 redirect URI: `https://chatgpt.com/robots.txt` (ChatGPT 的 OAuth callback)

### 3.2 更新 OAuth 配置

在 `src/handlers/oauth-auth-server.js` 中添加 ChatGPT redirect URI：

```javascript
const metadata = {
  // ...existing fields...
  chatgpt_compatible: true,
  redirect_uris_supported: [
    'https://chatgpt.com/robots.txt',
  ],
};
```

### 3.3 创建 ChatGPT OAuth Callback Handler

创建 `src/handlers/chatgpt-callback.js`:

```javascript
export async function handleChatGPTCallback(request, env) {
  // 处理 ChatGPT OAuth callback
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // 交换 token
  // ...
  
  // 返回给 ChatGPT
  return new Response(JSON.stringify({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Phase 4: App Metadata

### 4.1 创建 chatgpt-app-submission.json

```json
{
  "$schema": "https://developers.openai.com/apps-sdk/schemas/chatgpt-app-submission.v1.json",
  "schema_version": 1,
  "app_info": {
    "display_name": "Oh My Share",
    "subtitle": "Share HTML & code snippets",
    "description": "Oh My Share lets you instantly share HTML files and code snippets with end-to-end encryption. Upload, manage, and share your code with a single command.",
    "category": "DEVELOPER_TOOLS"
  },
  "tools": {
    "upload": {
      "annotations": {
        "readOnlyHint": false,
        "openWorldHint": false,
        "destructiveHint": false
      },
      "justifications": {
        "read_only_justification": "Creates a new share and returns a URL, but does not modify existing data.",
        "open_world_justification": "Only stores content in private R2 bucket, does not publish to public internet.",
        "destructive_justification": "Does not delete, overwrite, or perform irreversible actions."
      }
    },
    "list_assets": {
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false,
        "destructiveHint": false
      },
      "justifications": {
        "read_only_justification": "Only retrieves user's uploaded assets without modifying data.",
        "open_world_justification": "Only reads from private database, does not access external systems.",
        "destructive_justification": "Does not delete or modify any data."
      }
    },
    "view": {
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false,
        "destructiveHint": false
      },
      "justifications": {
        "read_only_justification": "Only retrieves and displays shared content without modification.",
        "open_world_justification": "Only reads from private storage, does not access external systems.",
        "destructive_justification": "Does not delete or modify any data."
      }
    },
    "delete": {
      "annotations": {
        "readOnlyHint": false,
        "openWorldHint": false,
        "destructiveHint": true
      },
      "justifications": {
        "read_only_justification": "Deletes the specified asset permanently.",
        "open_world_justification": "Only deletes from private storage, does not affect public systems.",
        "destructive_justification": "Permanently deletes the asset, which cannot be recovered."
      }
    },
    "get_info": {
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false,
        "destructiveHint": false
      },
      "justifications": {
        "read_only_justification": "Only returns static service information without any state changes.",
        "open_world_justification": "Does not access any external systems.",
        "destructive_justification": "Does not modify any data."
      }
    }
  },
  "test_cases": [
    {
      "description": "Upload HTML content for sharing",
      "user_prompt": "Share this HTML code for me: <html><body>Hello</body></html>",
      "file_attachment_urls": null,
      "tools_triggered": "upload",
      "expected_output": "Returns a share URL that can be opened in browser.",
      "expected_output_url": null
    },
    {
      "description": "List user's uploaded assets",
      "user_prompt": "Show me my uploaded files",
      "file_attachment_urls": null,
      "tools_triggered": "list_assets",
      "expected_output": "Returns a list of user's uploaded assets with URLs.",
      "expected_output_url": null
    },
    {
      "description": "View a shared HTML page",
      "user_prompt": "Open this share: https://openanthropic.com/view/abc123",
      "file_attachment_urls": null,
      "tools_triggered": "view",
      "expected_output": "Returns the HTML content of the shared page.",
      "expected_output_url": null
    },
    {
      "description": "Delete an uploaded asset",
      "user_prompt": "Delete my share abc123",
      "file_attachment_urls": null,
      "tools_triggered": "delete",
      "expected_output": "Successfully deletes the specified asset.",
      "expected_output_url": null
    },
    {
      "description": "Get service information",
      "user_prompt": "What is Oh My Share?",
      "file_attachment_urls": null,
      "tools_triggered": "get_info",
      "expected_output": "Returns service description and features.",
      "expected_output_url": null
    }
  ],
  "negative_test_cases": [
    {
      "description": "Do not trigger for unrelated requests",
      "user_prompt": "What's the weather today?",
      "file_attachment_urls": null,
      "tools_triggered": null,
      "expected_output": "The app should not be invoked because the request is outside its supported workflows.",
      "expected_output_url": null
    },
    {
      "description": "Do not trigger for text editing requests",
      "user_prompt": "Help me write an essay",
      "file_attachment_urls": null,
      "tools_triggered": null,
      "expected_output": "The app should not be invoked because the request is about text editing, not code sharing.",
      "expected_output_url": null
    },
    {
      "description": "Do not trigger for file management requests",
      "user_prompt": "Organize my documents",
      "file_attachment_urls": null,
      "tools_triggered": null,
      "expected_output": "The app should not be invoked because the request is about general file management, not HTML sharing.",
      "expected_output_url": null
    }
  ]
}
```

---

## Phase 5: Developer Platform 配置

### 5.1 登录 OpenAI Developer Platform

1. 访问 https://platform.openai.com
2. 登录你的 OpenAI 账号
3. 进入 Apps 部分

### 5.2 创建新 App

在 Developer Platform 中填写：

| 字段 | 值 |
|------|-----|
| App Name | Oh My Share |
| Description | Share HTML files and code snippets with end-to-end encryption |
| Category | Developer Tools |
| MCP Server URL | https://openanthropic.com/mcp |
| OAuth URL | https://openanthropic.com/oauth/authorize |
| Token URL | https://openanthropic.com/oauth/token |
| Privacy Policy URL | https://openanthropic.com/privacy |
| Support URL | https://openanthropic.com/support |

### 5.3 上传 chatgpt-app-submission.json

将 Phase 4 创建的 JSON 文件上传到 Developer Platform。

---

## Phase 6: Testing & Submission

### 6.1 测试环境配置

1. 在 ChatGPT 中启用 Developer Mode
2. 添加 Connector: `https://openanthropic.com/mcp`
3. 测试所有工具：
   - `upload` - 上传 HTML
   - `list_assets` - 列出资产
   - `view` - 查看分享
   - `delete` - 删除资产
   - `get_info` - 获取信息

### 6.2 测试账号

创建测试账号用于审核：

```
Email: test@openanthropic.com
Password: test123456
```

### 6.3 测试步骤

1. 在 ChatGPT 中说："Share this HTML: <html><body>Test</body></html>"
2. 验证上传成功
3. 验证返回 URL
4. 说："Show my shares"
5. 验证列表显示
6. 说："Delete share abc123"
7. 验证删除功能

### 6.4 提交审核

1. 在 Developer Platform 点击 "Submit for Review"
2. 等待 OpenAI 审核（通常 1-2 周）
3. 根据审核反馈修改
4. 重新提交

---

## Phase 7: Published

### 7.1 发布后配置

审核通过后：

1. App 进入 ChatGPT App Directory
2. 用户可以在 ChatGPT 中搜索 "Oh My Share"
3. 用户可以通过 @Oh My Share 触发
4. ChatGPT 可以根据上下文自动推荐

### 7.2 推广

1. 在网站添加 "Available in ChatGPT" 按钮
2. 更新 README 和文档
3. 在社交媒体宣布

---

## 审核常见问题

### 可能被拒绝的原因

1. **Tool annotations 不正确** - 确保 readOnlyHint, destructiveHint, openWorldHint 正确
2. **OAuth 配置错误** - 确保 redirect URI 正确
3. **隐私政策缺失** - 必须有隐私政策页面
4. **测试不充分** - 确保所有工具都能正常工作
5. **描述不清晰** - App 描述必须清晰说明功能

### 需要准备的文件

1. `chatgpt-app-submission.json` - App 提交配置
2. Privacy Policy - 隐私政策页面
3. Support Page - 支持页面
4. Test Account - 测试账号

---

## 时间线

| Phase | 任务 | 预计时间 |
|-------|------|----------|
| 1 | Apps SDK Compatibility | 1-2 天 |
| 2 | ChatGPT App UI Widgets | 2-3 天 |
| 3 | OAuth 配置 | 1 天 |
| 4 | App Metadata | 0.5 天 |
| 5 | Developer Platform 配置 | 0.5 天 |
| 6 | Testing & Submission | 1-2 天 |
| 7 | Review & Publish | 1-2 周 |
| **Total** | | **约 3-4 周** |
