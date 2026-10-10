import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';

const BASE_URL = 'https://openanthropic.com';

const LABELS = {
  en: {
    htmlLang: 'en',
    title: 'MCP Server — Connect Oh My Share to your AI client',
    desc: 'Install the Oh My Share MCP server in Claude Desktop, Claude Code, Cursor, Windsurf or VS Code. Six tools let AI agents upload HTML, view shares and search the gallery — no API key needed.',
    eyebrow: 'Remote MCP server',
    h1a: 'Give your AI a place to ',
    h1b: 'publish HTML.',
    sub: 'Oh My Share ships a hosted MCP server at openanthropic.com/mcp. Connect it once and your assistant can upload HTML or code and hand you back a link — no account required for uploading.',
    whatTitle: 'What is MCP?',
    whatBody: 'MCP (Model Context Protocol) is an open standard that lets AI clients call external tools. This server adds one tool your assistant actually wants: “publish this and give me a link”.',
    toolsTitle: 'Available tools',
    toolsNote: 'Anonymously available; OAuth sign-in only unlocks managing your own assets.',
    colTool: 'Tool',
    colDesc: 'What it does',
    colParams: 'Parameters',
    colAuth: 'Auth',
    authAnon: 'anonymous',
    authOauth: 'OAuth',
    installTitle: 'Install in your client',
    installNote: 'Every client below talks to the same remote endpoint — no local runtime, no npm package.',
    stepsLabel: 'Steps',
    configLabel: 'Config',
    promptTitle: 'Rather not configure it yourself? Paste this prompt to your AI',
    promptNote: 'Your agent will read the config file, write it, restart the client and verify the connection for you.',
    verifyTitle: 'How to verify the install',
    verifySteps: [
      'Ask your assistant: “call the oh-my-share get_info tool”. A healthy reply reports version 2.2.0.',
      'Then: “upload <h1>hi</h1> and give me the link”. The reply should contain an openanthropic.com/view/… link you can open.',
      'To manage or delete your own uploads, say “sign in to oh-my-share” — that uses OAuth; upload itself stays anonymous.',
    ],
    endpoint: 'Remote endpoint',
    copy: 'Copy',
    copied: 'Copied',
    copyFail: 'Copy failed — select and copy manually',
    faqTitle: 'Common questions',
    faq: [
      ['Do I need an account to upload?', 'No. The upload, view, get_info and search_gallery tools all work anonymously — 10 uploads per hour per IP, expired shares are deleted automatically. Signing in (OAuth) only adds list_assets and delete for your own content.'],
      ['Which transport does it use?', 'Streamable HTTP at https://openanthropic.com/mcp. Most clients pick this up automatically for http(s) URLs.'],
      ['Does expire work from MCP?', 'Yes — pass expiresIn as 1h, 24h, 7d, 30d or 90d. Expired shares are deleted from storage automatically.'],
      ['Can agents authenticate?', 'OAuth 2.1 endpoints are advertised at /.well-known/oauth-protected-resource; the full agent flow is documented in /auth.md.'],
    ],
    navLabel: 'MCP Guide',
    backTop: 'Back to app',
  },
  zh: {
    htmlLang: 'zh-CN',
    title: 'MCP 服务器 — 把 Oh My Share 接入你的 AI 客户端',
    desc: '在 Claude Desktop、Claude Code、Cursor、Windsurf、VS Code 中安装 Oh My Share MCP 服务器。六个工具让 AI 直接上传 HTML、查看分享、搜索作品广场，上传无需 API Key。',
    eyebrow: '远程 MCP 服务器',
    h1a: '给你的 AI 一个',
    h1b: '发布 HTML 的地方。',
    sub: 'Oh My Share 在 openanthropic.com/mcp 提供托管 MCP 服务器。连接一次，你的助手就能把 HTML 或代码变成一条链接 — 上传无需注册账号。',
    whatTitle: 'MCP 是什么？',
    whatBody: 'MCP（模型上下文协议）是一个让 AI 客户端调用外部工具的开放标准。这个服务器提供的是一个助手真正需要的工具：「发布它，然后给我链接」。',
    toolsTitle: '工具列表',
    toolsNote: '匿名即可调用；OAuth 登录仅用于管理自己的资产。',
    colTool: '工具',
    colDesc: '作用',
    colParams: '参数',
    colAuth: '权限',
    authAnon: '匿名可用',
    authOauth: '需 OAuth',
    installTitle: '在你的客户端中安装',
    installNote: '以下客户端都连接同一个远程端点 — 无需本地运行时，无需 npm 包。',
    stepsLabel: '操作步骤',
    configLabel: '配置文件',
    promptTitle: '不想自己动手？把这段提示词直接丢给你的 AI',
    promptNote: '智能体会自己读配置、改文件、重启客户端并验证连接。',
    verifyTitle: '怎么确认装好了',
    verifySteps: [
      '问助手：「调用 oh-my-share 的 get_info 工具」。正常会返回版本 2.2.0。',
      '再问：「上传 <h1>hi</h1> 并把链接给我」。回复里应包含一个能打开的 openanthropic.com/view/… 链接。',
      '想管理或删除自己的上传，说「登录 oh-my-share」— 这走 OAuth；上传本身保持匿名。',
    ],
    endpoint: '远程端点',
    copy: '复制',
    copied: '已复制',
    copyFail: '复制失败 — 请手动选择复制',
    faqTitle: '常见问题',
    faq: [
      ['上传需要账号吗？', '不需要。upload、view、get_info、search_gallery 四个工具匿名即可使用（同一 IP 每小时 10 次上传，过期分享自动删除）。OAuth 登录仅额外开放 list_assets 与 delete 用于管理自己的内容。'],
      ['使用什么传输方式？', 'Streamable HTTP，端点 https://openanthropic.com/mcp。大多数客户端对 http(s) 地址会自动选择该方式。'],
      ['MCP 里能设置过期时间吗？', '可以 — expiresIn 传 1h、24h、7d、30d 或 90d。过期的分享会自动从存储中删除。'],
      ['智能体如何认证？', 'OAuth 2.1 端点在 /.well-known/oauth-protected-resource 中声明，完整智能体流程见 /auth.md。'],
    ],
    navLabel: 'MCP 指南',
    backTop: '回到首页',
  },
};

const TOOLS = [
  { name: 'upload', desc: { en: 'Upload HTML or code, get a shareable link', zh: '上传 HTML 或代码，返回分享链接' }, params: { en: 'content*, filename, language, password, expiresIn', zh: 'content*, filename, language, password, expiresIn' }, auth: 'anon' },
  { name: 'view', desc: { en: 'Read a shared page by id', zh: '按 id 读取分享内容' }, params: { en: 'id*', zh: 'id*' }, auth: 'anon' },
  { name: 'get_info', desc: { en: 'Server info, version and limits', zh: '服务器信息、版本与限制' }, params: { en: '—', zh: '—' }, auth: 'anon' },
  { name: 'search_gallery', desc: { en: 'Search the public gallery', zh: '搜索公开作品广场' }, params: { en: 'query, sort, page, limit ≤20', zh: 'query, sort, page, limit ≤20' }, auth: 'anon' },
  { name: 'list_assets', desc: { en: 'List your own uploads', zh: '列出你上传的内容' }, params: { en: '—', zh: '—' }, auth: 'oauth' },
  { name: 'delete', desc: { en: 'Delete one of your uploads', zh: '删除你上传的内容' }, params: { en: 'id*', zh: 'id*' }, auth: 'oauth' },
];

const CLIENTS = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    path: '~/Library/Application Support/Claude/claude_desktop_config.json',
    hint: {
      en: 'Remote MCP servers live in the Developer config file.',
      zh: '远程 MCP 服务器配置在开发者选项的 JSON 文件里。',
    },
    steps: {
      en: [
        'Open Claude → Settings → Developer → Edit Config (creates claude_desktop_config.json on first run).',
        'Paste the JSON below into the file and save.',
        'Quit Claude completely (Cmd+Q) and reopen it.',
        'Start a new chat and say: “List your MCP tools”.',
      ],
      zh: [
        '打开 Claude → 设置 → 开发者 → 编辑配置（首次会创建 claude_desktop_config.json）。',
        '把下方 JSON 粘贴进去，保存文件。',
        '完全退出 Claude（Cmd+Q）后重新打开。',
        '新开一个对话说：「列出你可用的 MCP 工具」。',
      ],
    },
    code: `{
  "mcpServers": {
    "oh-my-share": {
      "type": "http",
      "url": "https://openanthropic.com/mcp"
    }
  }
}`,
    prompt: `请帮我把 Oh My Share 这个远程 MCP 服务器加入 Claude Desktop：
1. 打开并编辑 ~/Library/Application Support/Claude/claude_desktop_config.json（macOS）
2. 在 mcpServers 中加入："oh-my-share": { "type": "http", "url": "https://openanthropic.com/mcp" }
3. 提醒我保存后完全退出并重启 Claude
4. 重启后调用一次 get_info 工具验证连接，把返回结果告诉我
该服务器匿名即可上传，无需 API Key。`,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    path: 'terminal',
    hint: {
      en: 'One command registers the remote server for your project.',
      zh: '一条命令即可为当前项目注册远程服务器。',
    },
    steps: {
      en: [
        'Run the command below in your project directory.',
        'Run /mcp to see connected servers — oh-my-share should be listed.',
        '“Upload this snippet to Oh My Share and give me the link.”',
      ],
      zh: [
        '在项目目录下运行下方命令。',
        '输入 /mcp 查看已连接的服务器，应出现 oh-my-share。',
        '直接说：「把这段 HTML 上传到 Oh My Share 并把链接给我」。',
      ],
    },
    code: `claude mcp add --transport http oh-my-share https://openanthropic.com/mcp`,
    prompt: `请把 Oh My Share MCP 服务器加入当前项目的 Claude Code：
1. 运行：claude mcp add --transport http oh-my-share https://openanthropic.com/mcp
2. 运行 /mcp 确认 oh-my-share 已连接
3. 调用 upload 工具上传 "<h1>hello from claude code</h1>"，把返回的链接给我
该服务器匿名即可上传，无需 API Key。`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    path: '~/.cursor/mcp.json',
    hint: {
      en: 'Settings → MCP → Add new global MCP server.',
      zh: '设置 → MCP → 添加新的全局 MCP 服务器。',
    },
    steps: {
      en: [
        'Open Settings → MCP → Add new global MCP server (or edit ~/.cursor/mcp.json).',
        'Paste the JSON below and save.',
        'Back in the MCP panel you should see oh-my-share with a green status dot.',
        'In Agent chat: “upload a demo page with Oh My Share”.',
      ],
      zh: [
        '打开 设置 → MCP → 添加新的全局 MCP 服务器（或直接编辑 ~/.cursor/mcp.json）。',
        '粘贴下方 JSON 并保存。',
        '回到 MCP 面板，oh-my-share 应显示绿色圆点。',
        '在 Agent 对话里说：「用 Oh My Share 上传一个演示页面」。',
      ],
    },
    code: `{
  "mcpServers": {
    "oh-my-share": {
      "url": "https://openanthropic.com/mcp"
    }
  }
}`,
    prompt: `请帮我把 Oh My Share 远程 MCP 服务器加入 Cursor：
1. 编辑 ~/.cursor/mcp.json，在 mcpServers 中加入：
   "oh-my-share": { "url": "https://openanthropic.com/mcp" }
2. 保存后刷新 MCP 列表
3. 调用一次 get_info 验证，把返回结果告诉我
该服务器匿名即可上传，无需 API Key。`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    path: '~/.codeium/windsurf/mcp_config.json',
    hint: {
      en: 'Cascade reads its MCP servers from this config file.',
      zh: 'Cascade 从这个配置文件读取 MCP 服务器。',
    },
    steps: {
      en: [
        'Edit ~/.codeium/windsurf/mcp_config.json (create it if missing).',
        'Paste the JSON below and save.',
        'Reload the Windsurf window; Cascade → MCP panel shows the server.',
        'Ask Cascade: “upload this HTML and share the link”.',
      ],
      zh: [
        '编辑 ~/.codeium/windsurf/mcp_config.json（没有就新建）。',
        '粘贴下方 JSON 并保存。',
        '重新加载 Windsurf 窗口，在 Cascade 的 MCP 面板能看到该服务器。',
        '对 Cascade 说：「上传这段 HTML 并给我分享链接」。',
      ],
    },
    code: `{
  "mcpServers": {
    "oh-my-share": {
      "serverUrl": "https://openanthropic.com/mcp"
    }
  }
}`,
    prompt: `请帮我把 Oh My Share 远程 MCP 服务器加入 Windsurf：
1. 编辑 ~/.codeium/windsurf/mcp_config.json，在 mcpServers 中加入：
   "oh-my-share": { "serverUrl": "https://openanthropic.com/mcp" }
2. 保存后重新加载窗口
3. 调用 get_info 验证连接并告诉我结果
该服务器匿名即可上传，无需 API Key。`,
  },
  {
    id: 'vscode',
    name: 'VS Code (Copilot)',
    path: '.vscode/mcp.json',
    hint: {
      en: 'Workspace-level servers go in .vscode/mcp.json.',
      zh: '工作区级服务器配置放在 .vscode/mcp.json。',
    },
    steps: {
      en: [
        'Create .vscode/mcp.json in your workspace root.',
        'Paste the JSON below and save.',
        'Copilot asks to trust the new server — allow it.',
        'In Copilot chat, ask it to use the oh-my-share tools.',
      ],
      zh: [
        '在工作区根目录创建 .vscode/mcp.json。',
        '粘贴下方 JSON 并保存。',
        'Copilot 会提示信任新服务器 — 点允许。',
        '在 Copilot 对话里让它调用 oh-my-share 的工具。',
      ],
    },
    code: `{
  "servers": {
    "oh-my-share": {
      "type": "http",
      "url": "https://openanthropic.com/mcp"
    }
  }
}`,
    prompt: `请帮我把 Oh My Share 远程 MCP 服务器加入 VS Code：
1. 在工作区创建 .vscode/mcp.json，内容为：
   { "servers": { "oh-my-share": { "type": "http", "url": "https://openanthropic.com/mcp" } } }
2. 保存并允许 Copilot 信任该服务器
3. 调用 get_info 验证连接，把结果告诉我
该服务器匿名即可上传，无需 API Key。`,
  },
  {
    id: 'other',
    name: { en: 'Other clients', zh: '其他客户端' },
    path: null,
    hint: {
      en: 'Any MCP client with remote server support.',
      zh: '任何支持远程服务器的 MCP 客户端。',
    },
    steps: {
      en: [
        'Add a remote/custom MCP server in your client.',
        'URL: https://openanthropic.com/mcp — transport: Streamable HTTP.',
        'No headers or API key required for anonymous upload.',
      ],
      zh: [
        '在客户端里添加「远程 / 自定义」MCP 服务器。',
        'URL 填 https://openanthropic.com/mcp，传输方式选 Streamable HTTP。',
        '匿名上传无需任何 Header 或 API Key。',
      ],
    },
    code: `https://openanthropic.com/mcp`,
    prompt: `请把 Oh My Share 远程 MCP 服务器添加到当前客户端：
- 服务器地址：https://openanthropic.com/mcp
- 传输方式：Streamable HTTP
- 认证：匿名即可上传（无需 API Key）；管理自己的资产才需要 OAuth
添加完成后调用 get_info 验证连接，并用 upload 上传 "<h1>test</h1>"，把返回链接给我。`,
  },
];

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CLIENT_SCRIPT = `
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-client-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-client-panel]'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      panels.forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-client-panel') === tab.getAttribute('data-client-tab'));
      });
    });
  });
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.getElementById(btn.getAttribute('data-copy')).textContent;
      var done = function () {
        btn.textContent = btn.getAttribute('data-copied');
        setTimeout(function () { btn.textContent = btn.getAttribute('data-copy-label'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { btn.textContent = btn.getAttribute('data-copy-fail'); });
      } else {
        btn.textContent = btn.getAttribute('data-copy-fail');
      }
    });
  });
})();
`;

export function handleMcpGuide(request) {
  const lang = resolveLang(request);
  const t = LABELS[lang] || LABELS.en;
  const other = lang === 'zh' ? 'en' : 'zh';

  const toolRows = TOOLS.map((tool) => `<tr>
      <td><code>${esc(tool.name)}</code></td>
      <td>${esc(tool.desc[lang] || tool.desc.en)}</td>
      <td class="mono-sm">${esc(tool.params[lang] || tool.params.en)}</td>
      <td><span class="auth-badge ${tool.auth}">${esc(tool.auth === 'anon' ? t.authAnon : t.authOauth)}</span></td>
    </tr>`).join('\n');

  const clientTabs = CLIENTS.map((c, i) => `<button type="button" class="client-tab${i === 0 ? ' active' : ''}" data-client-tab="${c.id}">${esc(typeof c.name === 'string' ? c.name : c.name[lang])}</button>`).join('\n');

  const clientPanels = CLIENTS.map((c, i) => {
    const name = typeof c.name === 'string' ? c.name : c.name[lang];
    const steps = c.steps[lang] || c.steps.en;
    return `<div class="client-panel${i === 0 ? ' active' : ''}" data-client-panel="${c.id}">
        <div class="client-head">
          <h3>${esc(name)}</h3>
          ${c.path ? `<span class="client-path mono-sm">${esc(c.path)}</span>` : ''}
        </div>
        <p class="client-hint">${esc(c.hint[lang] || c.hint.en)}</p>
        <ol class="client-steps">
${steps.map((s) => `          <li>${esc(s)}</li>`).join('\n')}
        </ol>
        <div class="code-block">
          <span class="code-label mono-sm">${esc(t.configLabel)}</span>
          <button type="button" class="copy-btn" data-copy="code-${c.id}" data-copy-label="${esc(t.copy)}" data-copied="${esc(t.copied)}" data-copy-fail="${esc(t.copyFail)}">${esc(t.copy)}</button>
          <pre id="code-${c.id}"><code>${esc(c.code)}</code></pre>
        </div>
        <div class="prompt-block">
          <span class="code-label mono-sm">${esc(t.promptTitle)}</span>
          <button type="button" class="copy-btn" data-copy="prompt-${c.id}" data-copy-label="${esc(t.copy)}" data-copied="${esc(t.copied)}" data-copy-fail="${esc(t.copyFail)}">${esc(t.copy)}</button>
          <pre id="prompt-${c.id}"><code>${esc(c.prompt)}</code></pre>
          <p class="prompt-note">${esc(t.promptNote)}</p>
        </div>
      </div>`;
  }).join('\n');

  const verifyHtml = t.verifySteps.map((s) => `<li>${esc(s)}</li>`).join('\n');

  const faqHtml = t.faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE_URL}/mcp-guide">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${BASE_URL}/mcp-guide">
<meta property="og:image" content="${BASE_URL}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<meta name="twitter:image" content="${BASE_URL}/og-image.png">
<style>${BASE_CSS}
.guide-main {
  max-width: 880px;
  margin: 0 auto;
  padding: clamp(26px, 4vw, 56px) var(--space-5) var(--space-10);
}
.guide-hero { text-align: center; margin-bottom: clamp(26px, 4vw, 44px); }
.guide-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 6px 14px; margin-bottom: var(--space-5);
}
.guide-eyebrow::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%;
  background: var(--gradient-primary);
  box-shadow: 0 0 10px rgba(255, 92, 124, 0.8);
  animation: guide-pulse 2s ease-in-out infinite;
}
@keyframes guide-pulse { 50% { opacity: 0.3; } }
.guide-hero h1 {
  font-size: clamp(32px, 5vw, 50px);
  font-weight: 750; letter-spacing: -0.035em; line-height: 1.1;
  margin-bottom: var(--space-4);
}
.guide-hero h1 em {
  font-style: normal;
  background: var(--gradient-primary);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.guide-hero p {
  max-width: 620px; margin: 0 auto;
  color: var(--color-text-secondary);
  font-size: clamp(14px, 1.6vw, 16px); line-height: 1.75;
}
.guide-lang { margin-top: var(--space-5); font-size: 13.5px; }
.guide-lang a { color: var(--color-link); text-decoration: none; }
.guide-section { margin-top: clamp(30px, 5vw, 52px); }
.guide-section > h2 {
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: 730; letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}
.guide-section > p {
  color: var(--color-text-secondary);
  font-size: 15px; line-height: 1.75; max-width: 680px;
  margin-bottom: var(--space-4);
}
.endpoint-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 10px 10px 10px 18px;
  background: rgba(255,255,255,0.03);
  width: fit-content; max-width: 100%;
}
.endpoint-row code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13.5px; color: var(--color-text);
}
.tools-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.tools-table th {
  text-align: left; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--color-text-secondary); font-weight: 600;
  padding: 10px 12px; border-bottom: 1px solid var(--color-hairline-strong);
}
.tools-table td { padding: 12px; border-bottom: 1px solid var(--color-hairline); vertical-align: top; }
.tools-table tr:last-child td { border-bottom: none; }
.tools-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; color: #5ce1d4;
}
.mono-sm { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: var(--color-text-secondary); }
.auth-badge {
  display: inline-block;
  font-size: 11.5px; font-weight: 600;
  border-radius: var(--radius-pill);
  padding: 3px 10px; white-space: nowrap;
}
.auth-badge.anon { background: rgba(92, 225, 212, 0.12); color: #2bb8ab; border: 1px solid rgba(92, 225, 212, 0.35); }
.auth-badge.oauth { background: rgba(255, 196, 107, 0.12); color: #c98a1e; border: 1px solid rgba(255, 196, 107, 0.4); }
.client-tabs {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: var(--space-5);
}
.client-tab {
  font-size: 13.5px; font-weight: 550;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  padding: 8px 16px; cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.client-tab:hover { color: var(--color-text); border-color: var(--color-hairline-strong); }
.client-tab.active {
  color: var(--color-text);
  border-color: transparent;
  background: var(--gradient-primary);
  box-shadow: 0 4px 14px rgba(255, 92, 124, 0.25);
}
.client-panel { display: none; }
.client-panel.active { display: block; animation: guide-fade 0.35s ease; }
@keyframes guide-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.client-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.client-head h3 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
.client-path { font-size: 12px; color: var(--color-text-secondary); }
.client-hint { font-size: 13.5px; color: var(--color-text-secondary); line-height: 1.65; margin: 0 0 var(--space-3); }
.client-steps {
  margin: 0 0 var(--space-4);
  padding-left: 22px;
  display: flex; flex-direction: column; gap: 7px;
}
.client-steps li {
  font-size: 14px; line-height: 1.65; color: var(--color-text);
}
.client-steps li::marker { color: var(--color-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
.verify-steps li { padding-left: 4px; }
.code-block { position: relative; }
.code-block pre {
  margin: 0; padding: 16px 18px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  overflow: auto;
}
.code-block code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; line-height: 1.7; color: var(--color-text);
  white-space: pre;
}
.code-label {
  display: block;
  font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 7px;
}
.code-block .code-label { padding-left: 2px; }
.copy-btn {
  position: absolute; top: 10px; right: 10px;
  font-size: 12px; font-weight: 600;
  color: var(--color-text-secondary);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 5px 12px; cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}
.copy-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.12); }
.prompt-block {
  position: relative;
  margin-top: var(--space-4);
  padding: var(--space-4) var(--space-4) var(--space-4);
  border: 1px dashed rgba(255, 92, 124, 0.45);
  border-radius: 14px;
  background: rgba(255, 92, 124, 0.05);
}
.prompt-block pre {
  margin: 0; padding: 14px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  overflow: auto;
}
.prompt-block code { white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.7; color: var(--color-text); }
.prompt-note { font-size: 12.5px; color: var(--color-text-secondary); margin: 10px 2px 0; }
.faq-item {
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 10px;
  background: rgba(255,255,255,0.02);
}
.faq-item summary {
  cursor: pointer;
  font-size: 14.5px; font-weight: 600;
  list-style: none;
}
.faq-item summary::before { content: '+ '; color: var(--color-text-secondary); font-weight: 400; }
.faq-item[open] summary::before { content: '− '; }
.faq-item p { font-size: 14px; line-height: 1.7; color: var(--color-text-secondary); margin: 10px 0 0; }
.guide-cta {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  margin-top: clamp(30px, 5vw, 48px);
}
.guide-cta .btn { min-width: 160px; }
@media (prefers-reduced-motion: reduce) {
  .client-panel.active { animation: none; }
}
</style>
</head>
<body>
${renderNav(
  lang,
  '/mcp-guide',
  `<a class="lang-switch" href="/mcp-guide?lang=${other}">${other === 'zh' ? '中文' : 'EN'}</a>
   <a class="account-button" href="/">${esc(t.backTop)}</a>`
)}
<main class="guide-main">
  <header class="guide-hero">
    <span class="guide-eyebrow">${esc(t.eyebrow)}</span>
    <h1>${esc(t.h1a)}<em>${esc(t.h1b)}</em></h1>
    <p>${esc(t.sub)}</p>
    <p class="guide-lang"><a href="/mcp-guide?lang=${other}">${other === 'zh' ? '切换到中文' : 'Read in English'}</a></p>
  </header>

  <section class="guide-section">
    <h2>${esc(t.whatTitle)}</h2>
    <p>${esc(t.whatBody)}</p>
    <div class="endpoint-row">
      <code>${esc(t.endpoint)}: https://openanthropic.com/mcp</code>
      <button type="button" class="copy-btn" style="position:static" data-copy="endpoint-code" data-copy-label="${esc(t.copy)}" data-copied="${esc(t.copied)}" data-copy-fail="${esc(t.copyFail)}">${esc(t.copy)}</button>
      <span id="endpoint-code" hidden>https://openanthropic.com/mcp</span>
    </div>
  </section>

  <section class="guide-section">
    <h2>${esc(t.toolsTitle)}</h2>
    <p>${esc(t.toolsNote)}</p>
    <div style="overflow-x:auto">
    <table class="tools-table">
      <thead><tr><th>${esc(t.colTool)}</th><th>${esc(t.colDesc)}</th><th>${esc(t.colParams)}</th><th>${esc(t.colAuth)}</th></tr></thead>
      <tbody>
${toolRows}
      </tbody>
    </table>
    </div>
  </section>

  <section class="guide-section">
    <h2>${esc(t.installTitle)}</h2>
    <p>${esc(t.installNote)}</p>
    <div class="client-tabs">
${clientTabs}
    </div>
${clientPanels}
  </section>

  <section class="guide-section">
    <h2>${esc(t.verifyTitle)}</h2>
    <ol class="client-steps verify-steps">
${verifyHtml}
    </ol>
  </section>

  <section class="guide-section">
    <h2>${esc(t.faqTitle)}</h2>
${faqHtml}
  </section>

  <div class="guide-cta">
    <a class="btn" href="/demo">${lang === 'zh' ? '看真实演示' : 'Watch the real demo'}</a>
    <a class="btn" href="/auth.md" style="background:transparent;border:1px solid var(--color-hairline-strong);color:var(--color-text)">${lang === 'zh' ? '智能体完整文档' : 'Full agent docs'}</a>
    <a class="btn" href="/" style="background:transparent;border:1px solid var(--color-hairline-strong);color:var(--color-text)">${esc(t.backTop)}</a>
  </div>
</main>
${renderFooter(lang)}
<script>${CLIENT_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      Vary: 'Accept-Language, CF-IPCountry',
    },
  });
}
