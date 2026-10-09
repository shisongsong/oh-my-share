// Landing pages — share the same design system as the homepage
import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { I18N } from '../i18n.js';

const BASE_URL = 'https://openanthropic.com';

const LANDING_CSS = `
.landing-hero {
  position: relative;
  padding: 72px var(--space-5) 44px;
  text-align: center;
  overflow: hidden;
}

.landing-hero::before {
  content: '';
  position: absolute;
  top: -180px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 460px;
  pointer-events: none;
  background:
    radial-gradient(420px 240px at 35% 40%, rgba(255,92,124,0.16), transparent 70%),
    radial-gradient(420px 240px at 65% 45%, rgba(92,225,212,0.16), transparent 70%);
}

.landing-hero-inner {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
}

.landing-hero h1 {
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: var(--space-4);
}

.landing-hero p {
  font-size: clamp(16px, 2vw, 18px);
  line-height: 1.5;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin: 0 auto;
}

.landing-content {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5) var(--space-8);
}

.landing-content h2 {
  font-size: clamp(22px, 3vw, 27px);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: var(--space-10) 0 var(--space-4);
}

.landing-content h2:first-child {
  margin-top: 0;
}

.landing-content h3 {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: var(--space-6) 0 var(--space-3);
}

.landing-content p {
  font-size: 15px;
  line-height: 1.65;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.landing-content ul,
.landing-content ol {
  margin: var(--space-3) 0 var(--space-5);
  padding-left: 22px;
}

.landing-content li {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.landing-content li strong,
.landing-content p strong {
  color: var(--color-text);
  font-weight: 600;
}

.landing-content table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-5) 0;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.landing-content th,
.landing-content td {
  padding: 13px 16px;
  text-align: left;
  font-size: 14px;
  border-bottom: 1px solid var(--color-hairline);
}

.landing-content th {
  background: var(--color-fill);
  font-weight: 600;
  color: var(--color-text);
}

.landing-content td {
  color: var(--color-text-secondary);
  background: var(--color-surface);
}

.landing-content tr:last-child td {
  border-bottom: none;
}

.landing-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--space-6);
}

a.lang-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

@media (max-width: 640px) {
  .landing-hero {
    padding-top: 52px;
  }
}
`;

const LANDING_PAGES = {
  'html-viewer': {
    en: {
      title: 'Online HTML Viewer - Preview & Test HTML Instantly | Oh My Share',
      description: 'Free online HTML viewer and preview tool. Paste HTML code and see the result instantly.',
      keywords: 'html viewer, html preview, online html editor, html tester',
      h1: 'Online HTML Viewer',
      subtitle: 'Paste HTML code and see the rendered result instantly. Free, no signup.',
      content: `
      <h2>How to Use</h2>
      <ol>
        <li>Go to the <a href="/">homepage</a></li>
        <li>Switch to "Paste Code" tab</li>
        <li>Paste your HTML code</li>
        <li>Click "Generate Link"</li>
        <li>Open the link to see the rendered HTML</li>
      </ol>
      <h2>Features</h2>
      <ul>
        <li>Instant preview — no server-side processing delay</li>
        <li>Works with any HTML, CSS, and JavaScript</li>
        <li>Shareable links you can send to anyone</li>
        <li>No registration required</li>
        <li>Free to use, no watermarks</li>
      </ul>
      <a href="/" class="btn landing-cta">Try It Free <span aria-hidden="true">→</span></a>
      `,
    },
    zh: {
      title: '在线 HTML 查看器 - 即时预览与测试 | Oh My Share',
      description: '免费在线 HTML 查看器和预览工具，粘贴 HTML 代码即时查看渲染结果，无需注册。',
      keywords: 'HTML 查看器, HTML 预览, 在线 HTML 编辑器, HTML 测试工具',
      h1: '在线 HTML 查看器',
      subtitle: '粘贴 HTML 代码，立即查看渲染效果。免费，无需注册。',
      content: `
      <h2>使用方法</h2>
      <ol>
        <li>打开<a href="/?lang=zh">首页</a></li>
        <li>切换到"粘贴代码"标签页</li>
        <li>粘贴你的 HTML 代码</li>
        <li>点击"生成分享链接"</li>
        <li>打开链接即可查看渲染结果</li>
      </ol>
      <h2>功能特性</h2>
      <ul>
        <li>即时预览 — 无需等待服务端处理</li>
        <li>支持任意 HTML、CSS 与 JavaScript</li>
        <li>生成的链接可分享给任何人</li>
        <li>无需注册即可使用</li>
        <li>完全免费，没有任何水印</li>
      </ul>
      <a href="/?lang=zh" class="btn landing-cta">免费试用 <span aria-hidden="true">→</span></a>
      `,
    },
  },
  'code-share': {
    en: {
      title: 'Share Code Snippets Online - Free & No Signup | Oh My Share',
      description: 'Share code snippets online instantly. Free code sharing tool without registration.',
      keywords: 'share code, code snippet share, pastebin alternative, code sharing tool',
      h1: 'Share Code Snippets Online',
      subtitle: 'Share your code with anyone instantly. No account needed, completely free.',
      content: `
      <h2>Supported Languages</h2>
      <ul>
        <li>HTML, CSS, and JavaScript</li>
        <li>Python, Java, Go, Rust</li>
        <li>JSON, YAML, XML</li>
        <li>Markdown, SQL</li>
        <li>Any text format</li>
      </ul>
      <h2>Why Oh My Share?</h2>
      <ul>
        <li><strong>No signup</strong> — start sharing immediately</li>
        <li><strong>End-to-end encryption</strong> — your code stays private</li>
        <li><strong>Permanent links</strong> — shares don't expire by default</li>
        <li><strong>Edit capability</strong> — update your shared code anytime</li>
      </ul>
      <a href="/" class="btn landing-cta">Share Your Code <span aria-hidden="true">→</span></a>
      `,
    },
    zh: {
      title: '在线分享代码片段 - 免费免注册 | Oh My Share',
      description: '在线即时分享代码片段。免费的代码分享工具，无需注册。',
      keywords: '代码分享, 代码片段分享, Pastebin 替代, 在线代码分享工具',
      h1: '在线分享代码片段',
      subtitle: '即刻把代码分享给任何人。无需账号，完全免费。',
      content: `
      <h2>支持的语言</h2>
      <ul>
        <li>HTML、CSS 与 JavaScript</li>
        <li>Python、Java、Go、Rust</li>
        <li>JSON、YAML、XML</li>
        <li>Markdown、SQL</li>
        <li>任意文本格式</li>
      </ul>
      <h2>为什么选择 Oh My Share？</h2>
      <ul>
        <li><strong>无需注册</strong> — 立即开始分享</li>
        <li><strong>端到端加密</strong> — 你的代码只有你能看</li>
        <li><strong>永久链接</strong> — 默认永不过期</li>
        <li><strong>可随时编辑</strong> — 已分享的内容也能更新</li>
      </ul>
      <a href="/?lang=zh" class="btn landing-cta">分享代码 <span aria-hidden="true">→</span></a>
      `,
    },
  },
  'codepen-alternative': {
    en: {
      title: 'Best CodePen Alternatives in 2026 - Free HTML/CSS/JS Playground',
      description: 'Looking for a free CodePen alternative? Oh My Share offers instant HTML/CSS/JS sharing without signup.',
      keywords: 'codepen alternative, jsfiddle alternative, free codepen, html sandbox alternative',
      h1: 'CodePen Alternative',
      subtitle: 'Free, no signup, instant HTML/CSS/JS sharing. Try it now.',
      content: `
      <h2>Oh My Share vs CodePen</h2>
      <table>
        <tr><th>Feature</th><th>Oh My Share</th><th>CodePen</th></tr>
        <tr><td>Free tier</td><td>Unlimited</td><td>Limited</td></tr>
        <tr><td>No signup required</td><td>Yes</td><td>No</td></tr>
        <tr><td>End-to-end encryption</td><td>Yes</td><td>No</td></tr>
        <tr><td>Instant sharing</td><td>One click</td><td>Multiple steps</td></tr>
      </table>
      <h2>Perfect For</h2>
      <ul>
        <li>Quick HTML prototypes</li>
        <li>Sharing code in chat or Slack</li>
        <li>Private code reviews</li>
        <li>Temporary code hosting</li>
      </ul>
      <a href="/" class="btn landing-cta">Try Oh My Share Free <span aria-hidden="true">→</span></a>
      `,
    },
    zh: {
      title: '2026 年最佳 CodePen 替代方案 - 免费 HTML/CSS/JS 演练场',
      description: '寻找免费的 CodePen 替代品？Oh My Share 提供无需注册的即时 HTML/CSS/JS 分享。',
      keywords: 'CodePen 替代, JSFiddle 替代, 免费代码沙盒, 在线 HTML 演练场',
      h1: 'CodePen 替代方案',
      subtitle: '免费、免注册，即时分享 HTML/CSS/JS，立即体验。',
      content: `
      <h2>Oh My Share 与 CodePen 对比</h2>
      <table>
        <tr><th>功能</th><th>Oh My Share</th><th>CodePen</th></tr>
        <tr><td>免费额度</td><td>无限制</td><td>有限制</td></tr>
        <tr><td>无需注册</td><td>是</td><td>否</td></tr>
        <tr><td>端到端加密</td><td>支持</td><td>不支持</td></tr>
        <tr><td>即时分享</td><td>一键完成</td><td>多个步骤</td></tr>
      </table>
      <h2>适用场景</h2>
      <ul>
        <li>快速 HTML 原型</li>
        <li>在聊天或 Slack 中分享代码</li>
        <li>私密代码审查</li>
        <li>临时代码托管</li>
      </ul>
      <a href="/?lang=zh" class="btn landing-cta">免费体验 <span aria-hidden="true">→</span></a>
      `,
    },
  },
  'ai-html-publish': {
    en: {
      title: 'Publish AI-Generated HTML Instantly - Free Hosting for ChatGPT & Claude Output',
      description: 'Got HTML from ChatGPT, Claude, or Gemini? Paste it and get a shareable link in one second. Free, no signup, optional end-to-end encryption.',
      keywords: 'publish ai html, chatgpt html share, claude generated html hosting, ai code share, share chatgpt output, gemini html link',
      h1: 'Publish AI-Generated HTML',
      subtitle: 'ChatGPT, Claude, and Gemini write the code — you get a live link in one second. Free, no signup, no watermark.',
      content: `
      <h2>From AI Chat to Live Link</h2>
      <p>AI assistants are great at writing HTML — landing pages, dashboards, animations,小游戏 — but getting that code out of the chat window and into a link you can share is clunky. Oh My Share turns it into one paste:</p>
      <ol>
        <li>Ask your AI for HTML (ChatGPT, Claude, Gemini, or any model)</li>
        <li>Copy the code</li>
        <li>Paste it here and hit Share</li>
        <li>Send the link — it works in any browser, including mobile</li>
      </ol>
      <h2>Built for AI Workflows</h2>
      <ul>
        <li><strong>MCP server built in</strong> — AI assistants can publish directly via the Model Context Protocol, no copy-paste needed</li>
        <li><strong>Instant preview</strong> — what you paste is exactly what viewers see, sandboxed safely</li>
        <li><strong>Edit in place</strong> — keep iterating with your AI and update the same link</li>
        <li><strong>Optional end-to-end encryption</strong> — for drafts you don't want anyone else to read</li>
        <li><strong>No account required</strong> — publish anonymously in seconds</li>
      </ul>
      <h2>What People Publish</h2>
      <ul>
        <li>Generated landing pages and portfolios</li>
        <li>Interactive data visualizations and dashboards</li>
        <li>CSS art, animations, and micro-demos</li>
        <li>Prototype tools before shipping them for real</li>
        <li>Sharing a working demo directly in chat, Slack, or a GitHub issue</li>
      </ul>
      <h2>Free Forever</h2>
      <p>Unlimited publishes, permanent links, no watermarks, no ads inside your content. Files are served with a sandboxed content-security policy so viewers are protected too.</p>
      <a href="/" class="btn landing-cta">Publish Your AI HTML <span aria-hidden="true">→</span></a>
      `,
    },
    zh: {
      title: '发布 AI 生成的 HTML - ChatGPT/Claude 代码一键变链接',
      description: 'AI 生成的 HTML 不用再复制来复制去？粘贴即得可分享链接，1 秒发布。免费、免注册、可选端到端加密。',
      keywords: '发布 AI HTML, ChatGPT HTML 分享, Claude 生成网页托管, AI 代码分享, AI 网页一键发布',
      h1: '发布 AI 生成的 HTML',
      subtitle: 'ChatGPT、Claude、Gemini 写好代码，你只需一秒拿到可分享链接。免费、免注册、无水印。',
      content: `
      <h2>从 AI 对话到可访问链接</h2>
      <p>AI 助手非常擅长写 HTML——落地页、仪表盘、动画、小游戏——但把代码从聊天窗口搬到能分享的链接往往很麻烦。Oh My Share 把它变成一次粘贴：</p>
      <ol>
        <li>向你的 AI 要一段 HTML（ChatGPT、Claude、Gemini 或任何模型）</li>
        <li>复制代码</li>
        <li>粘贴到这里，点击分享</li>
        <li>发送链接——任何浏览器都能打开，包括手机</li>
      </ol>
      <h2>为 AI 工作流而生</h2>
      <ul>
        <li><strong>内置 MCP 服务器</strong> — AI 助手可通过 Model Context Protocol 直接发布，无需复制粘贴</li>
        <li><strong>即时预览</strong> — 所见即所得，沙箱安全渲染</li>
        <li><strong>就地编辑</strong> — 和 AI 持续迭代，同一链接原地更新</li>
        <li><strong>可选端到端加密</strong> — 草稿不想让任何人看到时使用</li>
        <li><strong>无需注册</strong> — 匿名秒发</li>
      </ul>
      <h2>人们用它发布什么</h2>
      <ul>
        <li>AI 生成的落地页与作品集</li>
        <li>交互式数据可视化与仪表盘</li>
        <li>CSS 艺术、动画与小 Demo</li>
        <li>正式上线前的原型工具</li>
        <li>在聊天、Slack 或 GitHub Issue 里直接分享可运行 Demo</li>
      </ul>
      <h2>永久免费</h2>
      <p>无限发布、永久链接、无水印、内容里不塞广告。文件以沙箱 CSP 提供，同时保护访问者安全。</p>
      <a href="/?lang=zh" class="btn landing-cta">发布我的 AI HTML <span aria-hidden="true">→</span></a>
      `,
    },
  },
};

const LANDING_ALIASES = {
  'chatgpt-html-share': 'ai-html-publish',
};

function renderLandingPage(slug, lang) {
  const page = LANDING_PAGES[slug][lang] || LANDING_PAGES[slug].en;
  const active = `/${slug}`;
  const altLang = lang === 'zh' ? 'en' : 'zh';
  const nav = renderNav(
    lang,
    active,
    `<a class="lang-switch" id="langBtn" href="${active}?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      <button class="account-button" id="accountBtn" onclick="location.href='/?lang=${lang}'">${I18N[lang].accountBtn}</button>`
  );
  const footer = renderFooter(lang);

  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="keywords" content="${page.keywords}">
<meta name="robots" content="index, follow">
<meta name="google-site-verification" content="DBQv1hLP8zAfNxe33rUZVVM4ilMDoNrcpvwtJmoB03c">
<link rel="canonical" href="${BASE_URL}${active}${lang === 'zh' ? '?lang=zh' : ''}">
<link rel="alternate" hreflang="en" href="${BASE_URL}${active}">
<link rel="alternate" hreflang="zh" href="${BASE_URL}${active}?lang=zh">
<meta name="x-lang" content="${lang}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE_URL}${active}">
<meta property="og:image" content="${BASE_URL}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<style>${BASE_CSS}
${LANDING_CSS}</style>
</head>
<body>
${nav}
<section class="landing-hero">
  <div class="landing-hero-inner">
    <h1>${page.h1}</h1>
    <p>${page.subtitle}</p>
  </div>
</section>
<main class="landing-content">${page.content}</main>
${footer}
</body>
</html>`;
}

export function handleLandingPage(pathname, lang = 'en') {
  const rawSlug = pathname.slice(1);
  const slug = LANDING_ALIASES[rawSlug] || rawSlug;
  const entry = LANDING_PAGES[slug];
  if (!entry) return null;

  const html = renderLandingPage(slug, lang);
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      Vary: 'Accept-Language, Cookie',
    },
  });
}
