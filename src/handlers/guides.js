// Guides: long-form content pages that target the search queries our product
// pages cannot rank for (how-to / scenario queries). Bilingual, rendered with
// Article + FAQPage + BreadcrumbList structured data, linked from the footer,
// sitemap and llms.txt.
import { I18N, resolveLang } from '../i18n.js';
import { renderNav, accountActionHtml, faqJsonLd, breadcrumbs } from '../ui/theme.js';
import { renderDocument } from '../ui/render-document.js';
import { getCurrentUser } from '../auth.js';

const BASE_URL = 'https://openanthropic.com';
const UPDATED = '2026-10-16';

const GUIDES = {
  'how-to-share-html-file-online': {
    zh: {
      title: '如何在线分享 HTML 文件：上传即得链接，无需注册',
      metaTitle: '如何在线分享 HTML 文件（免费·无需注册）- Oh My Share',
      description:
        '一步步教你把本地 HTML 文件变成可以发给别人的公开链接：拖拽上传、粘贴代码、设置密码与有效期，以及用 MCP 让 AI 助手一键发布。',
      lead: '写完一个 HTML 页面，发给别人时最麻烦的往往不是部署，而是「怎么让对方点个链接就能看到」。这个指南把最省事的做法讲清楚，并给出三种可用路径：网页上传、命令行 curl、以及 MCP 智能体直发。',
      sections: [
        {
          h2: '方法一：在网页上拖拽上传（最快）',
          body: [
            { p: '打开站点首页，把 .html 文件直接拖进上传框，或者切到「粘贴代码」标签把源码贴进去，点击生成分享链接，全程不需要注册。' },
            {
              list: [
                '支持 .html 与 .htm，单文件上限 2 MB',
                '默认永久有效，可在「高级选项」里改成 1 小时 / 1 天 / 7 天 / 30 天',
                '需要私密内容时勾选「访问密码」，查看者输入密码才能打开',
                '生成后会同时给出管理链接，可随时改标题、描述或删除',
              ],
            },
          ],
        },
        {
          h2: '方法二：粘贴代码，适合小片段',
          body: [
            { p: '代码片段、单页动画、一段可视化 demo 都可以直接粘贴。分享出去后在任何浏览器打开就是完整效果，桌面和手机都适配。' },
            { code: '```\n<textarea id="code" placeholder="粘贴 HTML 源码"></textarea>\n<script>\n  fetch("/api/upload", { method: "POST", body: document.getElementById("code").value })\n    .then(r => r.json()).then(d => console.log(d.url));\n</script>\n```' },
          ],
        },
        {
          h2: '方法三：用 REST API 或 MCP 自动发布',
          body: [
            { p: '需要在流水线、定时任务或 AI 助手里发布时，可以完全跳过界面。REST 适合脚本，MCP 适合智能体。' },
            { code: '```bash\ncurl -F "file=@report.html" https://openanthropic.com/api/upload\n# => {"ok":true,"id":"a1b2c3d4e5","url":"https://openanthropic.com/view/a1b2c3d4e5"}\n```' },
{ p: 'MCP 端点同样支持匿名调用，Claude、Cursor 等客户端接入后可直接说「把这个 HTML 分享成链接」。完整说明见 MCP 接入指南。' },
          ],
        },
        {
          h2: '让对方看到的内容和本地完全一致',
          body: [
            { p: '分享链接会直接渲染你的 HTML，没有站点包裹的外壳。为了不影响你的脚本运行，内容以沙箱方式提供，并带独立的内容安全策略；如果你需要页面内部再嵌 iframe，记得给 iframe 加上 sandbox 允许的属性。' },
            { note: '提示：页面里引用本地图片或 CSS 是最常见的翻车原因。上传前把相对路径改成完整的 https 地址，否则对方打开会看到裂图。' },
          ],
        },
        {
          h2: '常见问题',
          body: [
            {
              list: [
                '链接会过期吗？默认永久有效，除非你主动设置了有效期。',
                '可以修改已分享的内容吗？可以。用生成时的编辑链接就能更新内容，链接本身不变。',
                '内容安全吗？可选端到端加密，文件在浏览器里加密后才上传，服务器拿不到密钥。',
                '能撤回吗？能。删除后链接立即失效。',
              ],
            },
          ],
        },
      ],
      faq: [
        ['如何在线分享 HTML 文件？', '把 .html 文件拖到上传框，或粘贴 HTML 源码，点击生成即可得到一个公开链接，无需注册。'],
        ['分享的 HTML 链接会过期吗？', '默认永久有效。你也可以在高级选项里设置 1 小时、1 天、7 天或 30 天后自动过期。'],
        ['可以给链接加密码吗？', '可以。在高级选项中设置访问密码后，查看者必须输入密码才能打开页面。'],
        ['如何删除已经分享的内容？', '上传时会同时生成管理链接，凭该链接即可删除内容或修改标题与描述。'],
        ['分享的页面里图片显示不出来怎么办？', '因为图片用了本地相对路径。上传前把图片、CSS、JS 引用改成完整的 https 地址即可。'],
      ],
      related: [
        { href: '/chatgpt-html-share', label: '发布 AI 生成的 HTML' },
        { href: '/code-share', label: '分享代码片段' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
      ],
    },
    en: {
      title: 'How to share an HTML file online: upload, get a link, no signup',
      metaTitle: 'How to Share an HTML File Online (Free, No Signup) - Oh My Share',
      description:
        'Turn a local HTML file into a link anyone can open: drag-and-drop upload, paste code, optional password and expiry, plus one-call publishing from AI agents over MCP.',
      lead: 'The hard part of sharing a page you just built is rarely the deployment — it is getting the other person to see it with a single click. This guide covers the three practical routes: the web uploader, a curl call, and direct publishing from an AI agent over MCP.',
      sections: [
        {
          h2: 'Route 1: drag and drop in the browser (fastest)',
          body: [
            { p: 'Open the home page and drop your .html file into the upload box, or switch to the paste-code tab and drop in the source. You get a share link immediately — no account needed.' },
            {
              list: [
                'Accepts .html and .htm, up to 2 MB per file',
                'Links are permanent by default; expiry can be set to 1 hour / 1 day / 7 days / 30 days',
                'Set an access password when the content should not be public',
                'Every upload also returns a manage link so you can retitle or delete it later',
              ],
            },
          ],
        },
        {
          h2: 'Route 2: paste the code',
          body: [
            { p: 'A snippet, a one-file animation or a small visualisation works just as well pasted straight in. The shared link renders it directly, on desktop and mobile.' },
            { code: '```\nPOST https://openanthropic.com/api/upload\nContent-Type: application/json\n\n{"content": "<h1>Hello</h1>", "filename": "hello.html"}\n```' },
          ],
        },
        {
          h2: 'Route 3: automate it with REST or MCP',
          body: [
            { p: 'In a pipeline, a cron job or an AI assistant, skip the UI entirely.' },
            { code: '```bash\ncurl -F "file=@report.html" https://openanthropic.com/api/upload\n# => {"ok":true,"id":"a1b2c3d4e5","url":"https://openanthropic.com/view/a1b2c3d4e5"}\n```' },
            { p: 'The MCP endpoint accepts anonymous calls too, so a connected assistant can publish on request. See the MCP guide for client setup.' },
          ],
        },
        {
          h2: 'Make sure the recipient sees what you saw',
          body: [
            { p: 'The link renders your HTML with no site chrome around it. Content is served sandboxed with its own content security policy, so scripts keep running without putting visitors at risk.' },
            { note: 'Most common failure: relative paths. An <img src="logo.png"> that worked on your machine is a broken image for everyone else — use absolute https URLs before uploading.' },
          ],
        },
        {
          h2: 'Questions people actually ask',
          body: [
            {
              list: [
                'Do links expire? Not by default — unless you choose an expiry.',
                'Can I edit shared content later? Yes, with the edit token you received at upload time. The link stays the same.',
                'Is it private? End-to-end encryption is optional: the file is encrypted in your browser, so the server never sees the key.',
                'Can I take it down? Yes. Deleting removes the content immediately.',
              ],
            },
          ],
        },
      ],
      faq: [
        ['How do I share an HTML file online?', 'Drag the .html file into the upload box, or paste the source and click generate. You get a public link without registering.'],
        ['Do the links expire?', 'By default links are permanent. You can optionally set them to expire after 1 hour, 1 day, 7 days or 30 days.'],
        ['Can I password-protect a link?', 'Yes. Set an access password in the advanced options and viewers must enter it before the page renders.'],
        ['How do I delete content I shared?', 'Use the manage link returned at upload time — it can delete the content or update its title and description.'],
        ['Why are images missing on the shared page?', 'They use local relative paths. Upload after switching image, CSS and JS references to absolute https URLs.'],
      ],
      related: [
        { href: '/ai-html-publish', label: 'Publish AI-generated HTML' },
        { href: '/code-share', label: 'Share code snippets' },
        { href: '/mcp-guide', label: 'MCP setup guide' },
      ],
    },
  },

  'share-ai-generated-html': {
    zh: {
      title: 'AI 生成的 HTML 怎么发布：一键变成可分享链接',
      metaTitle: 'AI 生成的 HTML 怎么发布 - ChatGPT/Claude/Gemini 作品一键分享 | Oh My Share',
      description:
        'ChatGPT、Claude、Gemini 写出的 HTML 怎么给别人看？三种发布方式对比：手动粘贴、REST API、MCP 智能体直发，附常见问题与工作流建议。',
      lead: '让 AI 写 HTML 很容易，难的是把对话窗口里的代码拿出来变成一个能发出去的链接。把代码从聊天框里抠出来、传文件、再发链接，这套动作每天都在重复。下面三种方式可以按你的场景选一种。',
      sections: [
        {
          h2: '方式一：粘贴即用（适合偶发需求）',
          body: [
            { p: '在 AI 对话里让它输出完整 HTML，复制代码，粘到「粘贴代码」标签，点生成。整个过程 10 秒内完成，不需要账号。' },
            { note: '提示：让 AI 输出时加一句「请输出可直接运行的单个 HTML 文件，包含内联 CSS 和 JS，不要使用外部依赖」，成功率会高很多。' },
          ],
        },
        {
          h2: '方式二：REST API（适合批量与自动化）',
          body: [
            { p: '需要每天生成几十份报告、或在 CI 里跑时，用 API 更省事。' },
            { code: '```bash\ncurl -F "file=@ai-page.html" https://openanthropic.com/api/upload\n```' },
            {
              list: [
                '匿名可用，限速 10 次/小时、50 次/天',
                '需要更高额度可注册账号，登录后用 API Key 走 CORS 代理',
                '可选加密上传，密钥只出现在分享链接里',
              ],
            },
          ],
        },
        {
          h2: '方式三：MCP 智能体直发（适合重度用户）',
          body: [
            { p: '把本服务接入 Claude 或 Cursor 后，你只需要说「把这个 HTML 发布成链接」，助手自己完成上传并把链接回给你。' },
            { code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { p: '匿名上传无需任何凭据；只有「列出我的内容」和「删除」才需要 OAuth 或 API Key。接入步骤见 MCP 接入指南。' },
          ],
        },
        {
          h2: '给 AI 生成页面的一点建议',
          body: [
            {
              list: [
                '让 AI 用单个文件产出，避免依赖 CDN 资源导致对方打开时样式丢失',
                '移动端优先：分享场景大多发生在手机上',
                '交互多的页面建议设置访问密码或有效期，避免长期暴露',
                '想长期保留可发布到作品广场，获得一个公开作品页和浏览量',
              ],
            },
          ],
        },
      ],
      faq: [
        ['AI 生成的 HTML 怎么分享给别人？', '复制源码粘贴到上传框，或用 REST API / MCP 一次调用上传，得到链接后发给别人即可。'],
        ['需要注册账号吗？', '不需要。匿名上传即可使用，只有列出和管理自己的内容才需要登录。'],
        ['上传有限制吗？', '匿名用户每小时 10 次、每天 50 次，单文件 2 MB 以内。'],
        ['生成的页面会不会被平台改动？', '不会。链接直接渲染你的 HTML，不会插入任何广告或外框。'],
      ],
      related: [
        { href: '/chatgpt-html-share', label: 'ChatGPT HTML 发布页' },
        { href: '/html-viewer', label: '在线 HTML 查看器' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
      ],
    },
    en: {
      title: 'How to publish AI-generated HTML as a shareable link',
      metaTitle: 'Publish AI-Generated HTML - Share ChatGPT/Claude/Gemini Output | Oh My Share',
      description:
        'Got HTML from ChatGPT, Claude or Gemini? Three ways to turn it into a link people can open: paste, REST API, or direct publishing from an MCP agent — with limits and workflow tips.',
      lead: 'Asking an AI for HTML is easy. Getting it out of the chat window and into a link anyone can open is the tedious part — copy the code, upload a file, send the link. Pick whichever of these three routes fits how often you do it.',
      sections: [
        {
          h2: 'Route 1: paste it (occasional use)',
          body: [
            { p: 'Ask the assistant for a complete single HTML file, copy it, paste it into the paste-code tab, and click generate. Under ten seconds, no account.' },
            { note: 'Ask for "one self-contained HTML file with inline CSS and JS, no external dependencies" and you will get something that renders correctly far more often.' },
          ],
        },
        {
          h2: 'Route 2: REST API (batch and automation)',
          body: [
            { p: 'When you generate dozens of reports a day or run this in CI, script it.' },
            { code: '```bash\ncurl -F "file=@ai-page.html" https://openanthropic.com/api/upload\n```' },
            {
              list: [
                'Anonymous access: 10 uploads per hour, 50 per day',
                'Register for higher quotas and use an API key for the CORS proxy',
                'Optional encrypted upload — the key only ever exists inside the share link',
              ],
            },
          ],
        },
        {
          h2: 'Route 3: publish straight from an MCP agent',
          body: [
            { p: 'Connect the server to Claude or Cursor once, then just say "publish this HTML and give me the link". The assistant uploads and hands the link back.' },
            { code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { p: 'Anonymous uploads need no credentials at all; only listing and deleting your own uploads require OAuth or an API key. Setup details are in the MCP guide.' },
          ],
        },
        {
          h2: 'Practical advice for AI-generated pages',
          body: [
            {
              list: [
                'Insist on a single file — CDN dependencies break for the recipient',
                'Design mobile-first: most shared links get opened on a phone',
                'For anything interactive, set a password or an expiry so it is not exposed forever',
                'Publish to the gallery if you want a permanent public page with view counts',
              ],
            },
          ],
        },
      ],
      faq: [
        ['How do I share HTML that ChatGPT or Claude generated?', 'Copy the source into the paste box, or call the REST API / MCP tool once, then send the returned link.'],
        ['Do I need an account?', 'No. Anonymous uploads work; signing in is only needed to list and manage your own content.'],
        ['What are the limits?', 'Anonymous users get 10 uploads per hour and 50 per day, with a 2 MB per-file limit.'],
        ['Will the platform modify my HTML?', 'No. The link renders your HTML as-is — no ads, no framing, no watermark.'],
      ],
      related: [
        { href: '/ai-html-publish', label: 'AI HTML publish page' },
        { href: '/html-viewer', label: 'Online HTML viewer' },
        { href: '/mcp-guide', label: 'MCP setup guide' },
      ],
    },
  },

  'share-claude-artifacts': {
    zh: {
      title: 'Claude Artifact 怎么分享给别人：一个链接搞定',
      metaTitle: '如何分享 Claude Artifact - 导出成链接 | Oh My Share',
      description:
        'Claude 生成的 Artifact 只能在对话里看？教你把表格、图表、React 组件和小游戏导出成公开链接发给同事，支持密码、有效期和端到端加密。',
      lead: 'Claude 的 Artifact 效果很好，但默认只能在那个对话里打开。想发给同事、客户，或者发到群里，最直接的办法就是把它变成一个链接。',
      sections: [
        {
          h2: '第一步：拿到 Artifact 的源码',
          body: [
            { p: '在 Claude 里点击 Artifact 右上角的下载按钮（或切换到代码视图复制全文），拿到一份完整的单文件源码。' },
          ],
        },
        {
          h2: '第二步：上传成链接',
          body: [
            { code: '```bash\ncurl -F "file=@artifact.html" https://openanthropic.com/api/upload\n# => https://openanthropic.com/view/a1b2c3d4e5\n```' },
            { p: '或者直接在网页上拖拽这个文件。十秒后你就有了一个任何浏览器都能打开的链接。' },
          ],
        },
        {
          h2: '第三步：按需要加保护',
          body: [
            {
              list: [
                '内部数据：设置访问密码，收到链接的人需要输入密码',
                '临时演示：设置 7 天有效期，到期自动下线',
                '敏感内容：勾选端到端加密，文件在浏览器里加密后才上传',
                '长期公开：发布到作品广场，获得独立作品页与浏览统计',
              ],
            },
          ],
        },
        {
          h2: '常见用法',
          body: [
            {
              list: [
                '把交互式图表发给不用装任何软件的人',
                '把 React/HTML 小游戏发到群里，直接点开就玩',
                '把 Claude 生成的报告转成可随时查阅的网页',
                '配合 MCP：让 Claude 自己发布 Artifact 并回传链接',
              ],
            },
          ],
        },
      ],
      faq: [
        ['Claude Artifact 可以分享给别人吗？', '可以。Artifact 本身是单文件 HTML，导出后上传即可得到一个公开链接。'],
        ['分享链接需要登录吗？', '不需要，匿名上传即可。只有管理自己的内容才需要账号。'],
        ['分享后还能修改吗？', '可以，用上传时返回的编辑链接更新内容，链接地址保持不变。'],
        ['可以加密分享吗？', '可以启用端到端加密，密钥只会出现在分享链接里，服务器无法读取内容。'],
      ],
      related: [
        { href: '/ai-html-publish', label: 'AI HTML 发布页' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
        { href: '/gallery', label: '作品广场' },
      ],
    },
    en: {
      title: 'How to share Claude artifacts with anyone, as a link',
      metaTitle: 'Share Claude Artifacts - Export an Artifact to a Link | Oh My Share',
      description:
        'Claude artifacts only open inside the chat. Export the generated HTML to a link you can send to colleagues or a group chat, with optional password, expiry and end-to-end encryption.',
      lead: 'Claude artifacts are excellent, but by default they only open inside that one conversation. To send one to a colleague or a client, the shortest path is turning it into a link.',
      sections: [
        {
          h2: 'Step 1: get the artifact source',
          body: [
            { p: 'Use the download button in the artifact header, or switch to the code view and copy the full file. What you get is a self-contained HTML document.' },
          ],
        },
        {
          h2: 'Step 2: upload it',
          body: [
            { code: '```bash\ncurl -F "file=@artifact.html" https://openanthropic.com/api/upload\n# => https://openanthropic.com/view/a1b2c3d4e5\n```' },
            { p: 'Or drag the file onto the upload box. Either way you have a link that opens in any browser within seconds.' },
          ],
        },
        {
          h2: 'Step 3: add the right protection',
          body: [
            {
              list: [
                'Internal data: set an access password so viewers must type it',
                'Temporary demo: give it a 7-day expiry so it disappears on its own',
                'Sensitive content: enable end-to-end encryption — the file is encrypted in your browser before upload',
                'Public and permanent: publish it to the gallery for a dedicated page and view counts',
              ],
            },
          ],
        },
        {
          h2: 'What people use this for',
          body: [
            {
              list: [
                'Sending an interactive chart to someone who will not install anything',
                'Dropping a React or HTML mini-game into a group chat',
                'Turning a generated report into a page you can link to forever',
                'Connecting MCP so Claude publishes its own artifacts and returns the link',
              ],
            },
          ],
        },
      ],
      faq: [
        ['Can I share a Claude artifact with someone else?', 'Yes. An artifact is a single HTML file — export it, upload it, and you have a link anyone can open.'],
        ['Do I need an account to share?', 'No. Anonymous uploads are enough; an account is only needed to manage your own files.'],
        ['Can I update it after sharing?', 'Yes. Use the edit link returned at upload time — the public URL stays the same.'],
        ['Can the link be encrypted?', 'Yes. End-to-end encryption keeps the key inside the link itself; the server never sees it.'],
      ],
      related: [
        { href: '/ai-html-publish', label: 'Publish AI-generated HTML' },
        { href: '/mcp-guide', label: 'MCP setup guide' },
        { href: '/gallery', label: 'Gallery' },
      ],
    },
  },

  'share-html-reports-and-demos': {
    zh: {
      title: '用网页分享静态报告、作品集和一次性活动页',
      metaTitle: '如何用网页分享静态报告与作品集（免部署）| Oh My Share',
      description:
        '把 PDF 换成可交互网页、把作品集做成链接、把活动邀请页发出去：无需服务器和域名，上传即发布，支持密码、有效期与浏览统计。',
      lead: '报告、作品集、活动邀请页——这些东西的共同点是「做一次、看很多次、发出去就行」，而不是要长期维护的应用。为它们单独买个服务器往往不划算，一个链接就够了。',
      sections: [
        {
          h2: '场景一：静态报告与数据看板',
          body: [
            { p: '把 CSV 跑出的图表导出成一个 HTML 文件，传上去就是一个可交互的报告：对方可以筛选、切换图表，手机上也能看。比 PDF 链接实用得多。' },
            { note: '提醒：图表库用 CDN 的话，对方打开时需要联网。做正式报告时建议把库文件一起打包成 zip 上传，保证离线可看。' },
          ],
        },
        {
          h2: '场景二：作品集与简历页',
          body: [
            { p: '单文件作品集最省事：一个 HTML 承载所有内容，不用配域名、不用备案，改完直接更新同一个链接。' },
            {
              list: [
                '链接长期有效，方便写进简历或邮件签名',
                '随时更新内容，链接地址不变',
                '想统计浏览量就发布到作品广场，页面下方会显示浏览次数',
              ],
            },
          ],
        },
        {
          h2: '场景三：一次性活动页与邀请函',
          body: [
            { p: '活动通知、婚礼请柬、投票页这类内容，最合适的是设置有效期：活动结束链接自动失效，不用担心被人翻到。' },
            { code: '```\n高级选项 → 有效期 → 7 天 / 30 天\n高级选项 → 访问密码 → 仅受邀者可进入\n```' },
          ],
        },
        {
          h2: '不想公开给别人看的内容',
          body: [
            { p: '上传时勾选端到端加密，文件会在你的浏览器里用随机密钥加密后再上传，服务器只存密文。密钥包含在生成的链接里，链接泄露即内容泄露，因此适合临时分享而非长期公开。' },
          ],
        },
      ],
      faq: [
        ['没有服务器和域名可以发布网页吗？', '可以。上传后立刻得到一个可公开访问的链接，不需要服务器、域名或备案。'],
        ['分享的报告对方需要安装什么吗？', '不需要。用现代浏览器打开链接即可，手机和电脑都能正常显示。'],
        ['链接可以在活动结束后自动失效吗？', '可以，在高级选项里设置有效期，到期后内容自动下线。'],
        ['能知道有多少人看过吗？', '发布到作品广场后，页面会显示浏览次数与点赞数。'],
      ],
      related: [
        { href: '/how-to-share-html-file-online', label: '如何在线分享 HTML 文件' },
        { href: '/gallery', label: '作品广场' },
        { href: '/demo', label: '产品演示' },
      ],
    },
    en: {
      title: 'Share static reports, portfolios and one-off pages as a link',
      metaTitle: 'Share Static Reports and Portfolios Without a Server | Oh My Share',
      description:
        'Swap the PDF for an interactive report, publish a portfolio as a link, or send out an event page: no server or domain needed, with optional password, expiry and view counts.',
      lead: 'Reports, portfolios, invitation pages — they share one property: made once, viewed many times, then sent on. Standing up a server for that rarely makes sense. A link does.',
      sections: [
        {
          h2: 'Use case 1: static reports and dashboards',
          body: [
            { p: 'Export your chart output as one HTML file and upload it: the recipient gets an interactive report they can filter and switch between views, on a phone as well as a desktop. Far more useful than a PDF link.' },
            { note: 'If your chart library loads from a CDN, viewers need internet access. For reports that must work offline, bundle the library into a zip and upload that instead.' },
          ],
        },
        {
          h2: 'Use case 2: portfolios and résumé pages',
          body: [
            { p: 'A single-file portfolio is the easiest kind to maintain: one HTML file carrying everything, no domain, no deployment — update it and the same link serves the new version.' },
            {
              list: [
                'The link stays valid indefinitely, so it is safe to put in a résumé or email signature',
                'Update content any time; the URL never changes',
                'Publish to the gallery if you want a public page with view counts',
              ],
            },
          ],
        },
        {
          h2: 'Use case 3: one-off event pages',
          body: [
            { p: 'Announcements, invitations, voting pages — give them an expiry so the link dies when the event is over, instead of lingering where anyone can find it.' },
            { code: '```\nAdvanced options → Expiry → 7 days / 30 days\nAdvanced options → Password → invitees only\n```' },
          ],
        },
        {
          h2: 'When the content should not be public',
          body: [
            { p: 'Tick end-to-end encryption at upload: the file is encrypted in your browser with a random key before it ever reaches the server, which stores only ciphertext. The key lives inside the generated link — anyone with the link can read it, so this suits temporary sharing rather than permanent publication.' },
          ],
        },
      ],
      faq: [
        ['Can I publish a page without a server or domain?', 'Yes. Uploading returns a public link immediately — no server, domain or ICP filing involved.'],
        ['Does the recipient need to install anything?', 'No. Any modern browser opens the link, on mobile as well as desktop.'],
        ['Can the link expire after an event?', 'Yes. Set an expiry in the advanced options and the content is taken down automatically when it lapses.'],
        ['Can I see how many people viewed it?', 'Publish it to the gallery and the page shows view and like counts.'],
      ],
      related: [
        { href: '/how-to-share-html-file-online', label: 'How to share an HTML file online' },
        { href: '/gallery', label: 'Gallery' },
        { href: '/demo', label: 'Product demo' },
      ],
    },
  },
};

const GUIDE_CSS = `
.guides-main { max-width: 860px; margin: 0 auto; padding: clamp(32px, 5vw, 56px) var(--space-5) var(--space-10); }
.guides-main h1 { font-size: clamp(26px, 4vw, 34px); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-3); line-height: 1.25; }
.guides-lead { color: var(--color-text-secondary); font-size: 15.5px; line-height: 1.75; margin-bottom: var(--space-7); }
.g-card-list { display: grid; gap: 14px; margin-top: var(--space-6); }
.g-card {
  display: block; padding: 20px 22px; border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card); background: var(--color-surface); text-decoration: none; color: inherit;
}
.g-card:hover { border-color: var(--color-accent-pink); }
.g-card h2 { font-size: 16.5px; font-weight: 650; margin: 0 0 6px; }
.g-card p { margin: 0; font-size: 14px; color: var(--color-text-secondary); line-height: 1.65; }
.guide-body { font-size: 15.5px; line-height: 1.8; }
.guide-body h2 { font-size: 20px; font-weight: 650; margin: 34px 0 10px; letter-spacing: -0.01em; }
.guide-body p { margin: 0 0 12px; }
.guide-body ul { margin: 0 0 14px; padding-left: 20px; }
.guide-body li { margin-bottom: 7px; }
.guide-body pre {
  background: var(--color-surface-2); border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md); padding: 14px 16px; overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6;
}
.guide-note {
  border-left: 3px solid var(--color-accent-pink); background: var(--color-surface-2);
  padding: 12px 16px; border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-size: 14.5px; color: var(--color-text-secondary); margin: 0 0 14px;
}
.guide-related { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--color-hairline); }
.guide-related h2 { font-size: 15px; margin-bottom: 10px; }
.guide-related a { display: inline-block; margin-right: 16px; font-size: 14px; color: var(--color-accent-strong); text-decoration: none; }
.g-guide-updated { font-size: 13px; color: var(--color-text-tertiary); margin-top: 28px; }
`;

export function listGuides() {
  return Object.entries(GUIDES).map(([slug, entry]) => ({
    slug,
    zh: entry.zh.title,
    en: entry.en.title,
    descriptionZh: entry.zh.description,
    descriptionEn: entry.en.description,
  }));
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      if (block.p) return `<p>${block.p}</p>`;
      if (block.note) return `<p class="guide-note">${block.note}</p>`;
      if (block.list) return `<ul>${block.list.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      if (block.code) {
        // guides store fenced code without the fence
        return `<pre><code>${esc(block.code.replace(/^```[a-z]*\n?/, '').replace(/```$/, ''))}</code></pre>`;
      }
      return '';
    })
    .join('\n');
}

function guideNav(lang, path, altLang, viewer) {
  return renderNav(
    lang,
    '',
    `<a class="lang-switch" href="${path}?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      ${accountActionHtml(I18N[lang] || I18N.en, viewer)}`
  );
}

export async function handleGuidesIndex(request, env) {
  const lang = resolveLang(request);
  const other = lang === 'zh' ? 'en' : 'zh';
  const viewer = await getCurrentUser(request, env);
  const nav = guideNav(lang, '/guides', other, viewer);

  const cards = listGuides()
    .map((g) => {
      const title = lang === 'zh' ? g.zh : g.en;
      const desc = lang === 'zh' ? g.descriptionZh : g.descriptionEn;
      return `<a class="g-card" href="/guides/${g.slug}${lang === 'zh' ? '?lang=zh' : ''}">
      <h2>${esc(title)}</h2>
      <p>${esc(desc)}</p>
    </a>`;
    })
    .join('\n');

  const html = renderDocument({
    lang,
    title: `${lang === 'zh' ? '使用指南' : 'Guides'} - Oh My Share`,
    description:
      lang === 'zh'
        ? '如何在线分享 HTML 文件、发布 AI 生成的代码、分享报告与作品集：实用指南与常见问题。'
        : 'How to share HTML files online, publish AI-generated pages, and send reports and portfolios as links: practical guides and FAQs.',
    robots: 'index, follow',
    canonical: `${BASE_URL}/guides`,
    hreflangPath: '/guides',
    og: true,
    twitter: true,
    styles: [GUIDE_CSS],
    nav,
    body: `<main class="guides-main">
  <h1>${lang === 'zh' ? '使用指南' : 'Guides'}</h1>
  <p class="guides-lead">${lang === 'zh' ? '从零开始把 HTML 页面变成一个能发出去的链接。' : 'From a local HTML file to a link you can send — step by step.'}</p>
  <div class="g-card-list">
${cards}
  </div>
</main>`,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      Vary: 'Accept-Language, Cookie',
    },
  });
}

export async function handleGuidePage(request, env, slug) {
  const entry = GUIDES[slug];
  const lang = resolveLang(request);
  const viewer = await getCurrentUser(request, env);

  if (!entry) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const copy = entry[lang] || entry.en;
  const other = lang === 'zh' ? 'en' : 'zh';
  const nav = guideNav(lang, `/guides/${slug}`, other, viewer);

  const bodySections = copy.sections
    .map((section) => `<h2>${esc(section.h2)}</h2>\n${renderBlocks(section.body)}`)
    .join('\n');

  const related = (copy.related || [])
    .map((link) => `<a href="${link.href}">${esc(link.label)}</a>`)
    .join('');

  const html = renderDocument({
    lang,
    title: copy.metaTitle,
    description: copy.description,
    robots: 'index, follow',
    canonical: `${BASE_URL}/guides/${slug}`,
    hreflangPath: `/guides/${slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: copy.title,
      description: copy.description,
      url: `${BASE_URL}/guides/${slug}`,
      dateModified: UPDATED,
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
      author: { '@type': 'Organization', name: 'Oh My Share', url: BASE_URL },
      publisher: { '@type': 'Organization', name: 'Oh My Share', url: BASE_URL },
      mainEntityOfPage: `${BASE_URL}/guides/${slug}`,
    },
    breadcrumbs: breadcrumbs(lang, [
      { name: lang === 'zh' ? '使用指南' : 'Guides', path: '/guides' },
      { name: copy.title, path: `/guides/${slug}` },
    ]),
    og: true,
    twitter: true,
    styles: [GUIDE_CSS],
    nav,
    body: `<main class="guides-main">
  <h1>${esc(copy.title)}</h1>
  <p class="guides-lead">${esc(copy.lead)}</p>
  <article class="guide-body">
${bodySections}
  </article>
  <div class="guide-related">
    <h2>${lang === 'zh' ? '相关页面' : 'Related'}</h2>
    ${related}
  </div>
  <p class="g-guide-updated">${lang === 'zh' ? '最后更新' : 'Last updated'}: ${UPDATED}</p>
</main>`,
    headExtra: faqJsonLd(copy.faq),
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      Vary: 'Accept-Language, Cookie',
    },
  });
}