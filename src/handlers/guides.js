// Guides: long-form content pages that target the search queries our product
// pages cannot rank for (how-to / scenario queries). Bilingual, rendered with
// TechArticle + FAQPage + BreadcrumbList structured data, linked from the
// footer, sitemap and llms.txt.
//
// Every factual claim here (limits, field names, defaults, response shapes,
// CSP) mirrors src/config.js, src/handlers/upload.js and src/handlers/mcp.js —
// keep them in sync when those change.
import { I18N, resolveLang } from '../i18n.js';
import { renderNav, accountActionHtml, faqJsonLd, breadcrumbs } from '../ui/theme.js';
import { renderDocument } from '../ui/render-document.js';
import { getCurrentUser } from '../auth.js';

const BASE_URL = 'https://openanthropic.com';
const UPDATED = '2026-10-17';

const GUIDES = {
  'how-to-share-html-file-online': {
    zh: {
      title: '如何在线分享 HTML 文件：上传即得链接，无需注册',
      metaTitle: '如何在线分享 HTML 文件（免费·无需注册）- Oh My Share',
      description:
        '把本地 HTML 文件变成任何人能打开的链接：网页上传、REST API、MCP 三种方式，附真实参数、返回字段、大小与有效期限制说明。',
      lead: '写完一个 HTML 页面，发给别人时最麻烦的往往不是部署，而是「怎么让对方点个链接就能看到」。这个指南把三条真实可用的路径讲清楚：网页上传、REST API、以及让 AI 助手通过 MCP 直发——全部附上与线上一致的参数和限制。',
      sections: [
        {
          h2: '方式一：在网页上拖拽上传（最快）',
          body: [
            { p: '打开首页，把 .html 文件拖进上传框；小片段可以切到「粘贴代码」标签直接贴源码。点生成分享链接即可，全程不需要注册。' },
            {
              list: [
                '文件上传上限 2 MB；粘贴代码上限 500 KB（按 UTF-8 字节计算）',
                '高级选项里可设置访问密码（最长 128 位）和有效期',
                '有效期四档：永久 / 1 小时 / 1 天 / 7 天 / 30 天，默认永久',
                '上传后会返回编辑密钥，凭它可以随时改内容、改标题或删除',
              ],
            },
          ],
        },
        {
          h2: '方式二：REST API（脚本与自动化）',
          body: [
            { p: '支持两种请求体。表单上传用 file 字段，粘贴代码用 code 字段；JSON 请求体里代码字段同样叫 code。' },
            {
              code: '```bash\n# 表单上传文件（@ 开头表示读取本地文件）\ncurl -F "file=@report.html" https://openanthropic.com/api/upload\n\n# 表单粘贴代码（必须用 --form-string：-F 里带 < 会被当成读取文件）\ncurl --form-string "code=<h1>Hello</h1>" https://openanthropic.com/api/upload\n\n# JSON 请求体：字段名是 code，不是 content\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Hello</h1>\\",\\"title\\":\\"Greeting\\",\\"slug\\":\\"greeting\\",\\"expiresIn\\":0}"\n```' },
            { p: '成功时返回的是链接本身和编辑凭据——注意没有 ok 字段：' },
            {
              code: '```json\n{\n  "url": "https://openanthropic.com/view/a1b2c3d4e5",\n  "id": "a1b2c3d4e5",\n  "editToken": "edt_9f8e7d6c5b4a3210",\n  "expiresAt": null\n}\n```' },
            {
              list: [
                'JSON 字段：code、slug（自定义链接后缀）、title、description、tags、password、expiresIn（单位秒，0 表示永久）',
                'expiresIn 省略时按 0 处理，即永久有效',
                'slug 只允许字母、数字和连字符，且不能与已有链接冲突',
                '管理页面地址是 /edit/<id>?token=<editToken>',
              ],
            },
          ],
        },
        {
          h2: '方式三：MCP 智能体直发',
          body: [
            { p: '接入 MCP 后可以直接对助手说「把这个 HTML 分享成链接」，它会调用 upload 工具并把链接回给你。匿名上传不需要任何凭据。' },
            {
              code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { code: '```json\n{"jsonrpc":"2.0","id":1,"method":"tools/call",\n "params":{"name":"upload","arguments":{"content":"<h1>Hello</h1>","expiresIn":"permanent"}}}\n```' },
            { note: '注意：MCP 的 expiresIn 默认是 7d，与网页端默认的「永久」不同。想要永久链接，必须显式传 expiresIn: "permanent"（也可传 0 / never）。可选值：1h、24h、7d、30d、90d。' },
          ],
        },
        {
          h2: '对方看到的效果与沙箱规则',
          body: [
            { p: '分享链接 /view/<id> 直接渲染你的 HTML，没有站点外框，也不插入任何广告。页面以沙箱方式提供，响应头包含：' },
            { code: '```\nContent-Security-Policy: sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox\n```' },
            { p: '脚本、表单、弹窗都能正常工作，但页面处于沙箱内，无法读取外部站点的数据。' },
            { note: '最常见的翻车原因：图片和 CSS 用了本地相对路径（如 src="logo.png"）。上传前改成完整 https 地址，否则对方打开是裂图。' },
          ],
        },
        {
          h2: '限速与额度',
          body: [
            {
              list: [
                '匿名用户：每小时 10 次上传，每天 50 次（网页与 REST 共用这个额度）',
                '超限会返回 429，并带上 Retry-After 提示',
                '需要更高额度可以注册账号；端到端加密属于付费功能，注册后会赠送 3 天试用',
              ],
            },
          ],
        },
      ],
      faq: [
        ['如何在线分享 HTML 文件？', '把 .html 文件拖到上传框，或粘贴 HTML 源码，点生成即可得到公开链接，无需注册。'],
        ['分享的链接会过期吗？', '网页和 REST 上传默认永久有效；MCP 的 upload 工具默认 7 天过期，需要永久请显式传 expiresIn: "permanent"。'],
        ['可以给链接加密码吗？', '可以。高级选项里设置访问密码（最长 128 位），查看者需要输入密码才能打开。'],
        ['如何修改或删除已经分享的内容？', '上传时返回的 editToken 就是管理凭据，访问 /edit/<id>?token=<editToken> 即可编辑或删除，链接地址不变。'],
        ['为什么对方打开时图片显示不出来？', '因为用了本地相对路径。上传前把图片、CSS、JS 引用改为完整的 https 地址。'],
        ['能拿到 HTML 源码吗？', '普通分享没有公开的源码接口，但可以用 MCP 的 view 工具按 id 读取；加密内容可通过 /api/content/<id> 拿到密文。'],
      ],
      related: [
        { href: '/share-ai-generated-html', label: '发布 AI 生成的 HTML' },
        { href: '/code-share', label: '分享代码片段' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
      ],
    },
    en: {
      title: 'How to share an HTML file online: upload, get a link, no signup',
      metaTitle: 'How to Share an HTML File Online (Free, No Signup) - Oh My Share',
      description:
        'Turn a local HTML file into a link anyone can open: web upload, REST API or MCP — with the real field names, response shape, size limits and expiry behaviour.',
      lead: 'The hard part of sharing a page you just built is rarely the deployment — it is getting the other person to see it with a single click. Here are three routes that actually work today, with the parameters and limits that match production.',
      sections: [
        {
          h2: 'Route 1: drag and drop in the browser (fastest)',
          body: [
            { p: 'Open the home page and drop your .html file into the upload box, or switch to the paste-code tab for snippets. You get a share link immediately — no account needed.' },
            {
              list: [
                'File uploads up to 2 MB; pasted code up to 500 KB (measured in UTF-8 bytes)',
                'Optional access password (up to 128 characters) and expiry in the advanced options',
                'Expiry choices: permanent / 1 hour / 1 day / 7 days / 30 days — permanent by default',
                'Every upload returns an edit token, which is how you update the content, retitle it, or delete it',
              ],
            },
          ],
        },
        {
          h2: 'Route 2: the REST API',
          body: [
            { p: 'Two request shapes are supported. Form uploads use the file field, pasted code uses code — and in a JSON body the code field is also called code.' },
            {
              code: '```bash\n# upload a file (@ reads the local file)\ncurl -F "file=@report.html" https://openanthropic.com/api/upload\n\n# paste code — use --form-string: a leading < in -F is read as a filename\ncurl --form-string "code=<h1>Hello</h1>" https://openanthropic.com/api/upload\n\n# JSON body — the field is "code", not "content"\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Hello</h1>\\",\\"title\\":\\"Greeting\\",\\"slug\\":\\"greeting\\",\\"expiresIn\\":0}"\n```' },
            { p: 'A successful response carries the link and the management credential — note there is no ok field:' },
            {
              code: '```json\n{\n  "url": "https://openanthropic.com/view/a1b2c3d4e5",\n  "id": "a1b2c3d4e5",\n  "editToken": "edt_9f8e7d6c5b4a3210",\n  "expiresAt": null\n}\n```' },
            {
              list: [
                'JSON fields: code, slug (custom suffix), title, description, tags, password, expiresIn (seconds, 0 = permanent)',
                'Omitting expiresIn means 0, i.e. permanent',
                'slugs accept letters, digits and hyphens, and must not collide with an existing link',
                'The manage page lives at /edit/<id>?token=<editToken>',
              ],
            },
          ],
        },
        {
          h2: 'Route 3: publish straight from an MCP agent',
          body: [
            { p: 'With the MCP server connected, just say "share this HTML as a link" — the assistant calls the upload tool and hands the link back. Anonymous uploads need no credentials at all.' },
            {
              code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { code: '```json\n{"jsonrpc":"2.0","id":1,"method":"tools/call",\n "params":{"name":"upload","arguments":{"content":"<h1>Hello</h1>","expiresIn":"permanent"}}}\n```' },
            { note: 'Watch out: the MCP upload tool defaults to 7d, unlike the web form which defaults to permanent. Pass expiresIn: "permanent" (or 0 / never) if you want a permanent link. Accepted values: 1h, 24h, 7d, 30d, 90d.' },
          ],
        },
        {
          h2: 'What the recipient gets, and the sandbox rules',
          body: [
            { p: 'The link /view/<id> renders your HTML directly — no site chrome, no ads. Content is served sandboxed, and the response carries:' },
            { code: '```\nContent-Security-Policy: sandbox allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox\n```' },
            { p: 'Scripts, forms and popups all keep working, but the page runs sandboxed and cannot read data from other sites.' },
            { note: 'Most common failure: relative paths. An <img src="logo.png"> that worked on your machine is a broken image for everyone else — switch to absolute https URLs before uploading.' },
          ],
        },
        {
          h2: 'Rate limits',
          body: [
            {
              list: [
                'Anonymous: 10 uploads per hour and 50 per day, shared across the web form and the REST endpoint',
                'Over the limit you get 429 with a Retry-After hint',
                'Create an account for higher quotas; end-to-end encryption is a paid feature and new accounts get a 3-day trial',
              ],
            },
          ],
        },
      ],
      faq: [
        ['How do I share an HTML file online?', 'Drag the .html file into the upload box, or paste the source and click generate. You get a public link without registering.'],
        ['Do the links expire?', 'Web and REST uploads are permanent by default. The MCP upload tool defaults to 7d — pass expiresIn: "permanent" for a permanent link.'],
        ['Can I password-protect a link?', 'Yes. Set an access password (up to 128 characters) in the advanced options; viewers must enter it before the page renders.'],
        ['How do I edit or delete content I shared?', 'The editToken returned at upload time is the credential. Open /edit/<id>?token=<editToken> to update or delete — the public URL stays the same.'],
        ['Why are images missing on the shared page?', 'They use local relative paths. Upload after switching image, CSS and JS references to absolute https URLs.'],
        ['Can I get the HTML source back?', 'Regular shares have no public source endpoint, but the MCP view tool returns content by id. Encrypted uploads expose their ciphertext at /api/content/<id>.'],
      ],
      related: [
        { href: '/guides/share-ai-generated-html', label: 'Publish AI-generated HTML' },
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
        'ChatGPT、Claude、Gemini 写出的 HTML 怎么给别人看？粘贴、REST API、MCP 三种发布方式的真实参数对照，附限速与有效期等容易踩的坑。',
      lead: '让 AI 写 HTML 很容易，难的是把对话窗口里的代码变成一个能发出去的链接。复制代码、传文件、再发链接，这套动作每天都在重复。下面三种方式按使用频率选一种，全部使用线上一致的参数。',
      sections: [
        {
          h2: '方式一：粘贴即用（适合偶发需求）',
          body: [
            { p: '让 AI 输出完整的单文件 HTML，复制源码，粘到「粘贴代码」标签，点生成。10 秒内完成，不需要账号。粘贴代码上限 500 KB。' },
            { note: '提示：让 AI 输出时加一句「请输出单文件 HTML，CSS 和 JS 内联，不依赖外部资源」，渲染成功的概率会高很多。' },
          ],
        },
        {
          h2: '方式二：REST API（适合批量与自动化）',
          body: [
            { p: '每天生成几十份报告、或者在 CI 里跑时用 API。JSON 请求体里代码字段是 code：' },
            {
              code: '```bash\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Report</h1>\\",\\"title\\":\\"Weekly report\\",\\"expiresIn\\":0}"\n# => {"url":"https://openanthropic.com/view/a1b2c3d4e5","id":"a1b2c3d4e5","editToken":"edt_...","expiresAt":null}\n```' },
            {
              list: [
                '匿名可用，限速每小时 10 次、每天 50 次',
                'expiresIn 单位是秒，传 0 或省略即永久有效',
                '文件上传走 -F "file=@x.html"，上限 2 MB',
                '端到端加密属于付费功能，注册后赠送 3 天试用',
              ],
            },
          ],
        },
        {
          h2: '方式三：MCP 智能体直发（适合重度用户）',
          body: [
            { p: '把服务接入 Claude 或 Cursor 之后，你只需要说「把这个 HTML 发布成链接」，助手自己完成上传并回传链接。' },
            { code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { code: '```json\n{"jsonrpc":"2.0","id":1,"method":"tools/call",\n "params":{"name":"upload","arguments":{"content":"<h1>Report</h1>","filename":"report.html","expiresIn":"30d"}}}\n```' },
            { note: 'MCP 的 expiresIn 默认是 7d，要永久链接必须显式传 "permanent"。匿名上传无需任何凭据；只有列出和删除自己内容才需要 OAuth 或 API Key。' },
          ],
        },
        {
          h2: '给 AI 生成页面的实战建议',
          body: [
            {
              list: [
                '坚持单文件产出：依赖 CDN 的页面在对方网络环境下可能样式错乱',
                '移动端优先：分享出去的链接大多是在手机上被打开',
                '交互页面建议设置访问密码或有效期，避免长期暴露',
                '需要长期公开并统计浏览量时，登录后把作品发布到作品广场',
              ],
            },
            { note: '加密或密码保护的内容无法发布到作品广场——加密功能是付费项，密码保护的内容本身也不适合公开。' },
          ],
        },
      ],
      faq: [
        ['AI 生成的 HTML 怎么分享给别人？', '复制源码粘贴到上传框，或用 REST API（字段 code）/ MCP upload 工具一次调用上传，然后把返回的 url 发出去。'],
        ['需要注册账号吗？', '不需要。匿名上传即可；只有管理自己的内容、发布到作品广场或使用加密功能才需要登录。'],
        ['上传有限制吗？', '匿名用户每小时 10 次、每天 50 次；文件 2 MB、粘贴代码 500 KB。'],
        ['生成的页面会被平台改动吗？', '不会。/view/<id> 直接渲染你的 HTML，不插入广告或外框，但会套一层沙箱 CSP。'],
      ],
      related: [
        { href: '/chatgpt-html-share', label: 'ChatGPT HTML 发布页' },
        { href: '/guides/share-claude-artifacts', label: '分享 Claude Artifact' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
      ],
    },
    en: {
      title: 'How to publish AI-generated HTML as a shareable link',
      metaTitle: 'Publish AI-Generated HTML - Share ChatGPT/Claude/Gemini Output | Oh My Share',
      description:
        'HTML from ChatGPT, Claude or Gemini: the real parameters for the paste, REST and MCP publishing routes, plus the limits and expiry defaults that trip people up.',
      lead: 'Getting an AI to write HTML is easy. Turning the code in that chat window into a link someone can open is the tedious part. Pick the route that matches how often you do it — all three use the production parameters.',
      sections: [
        {
          h2: 'Route 1: paste it (occasional use)',
          body: [
            { p: 'Ask for a complete single-file HTML, copy it, paste it into the paste-code tab and click generate. Under ten seconds, no account. Pasted code is capped at 500 KB.' },
            { note: 'Ask for "one self-contained HTML file, CSS and JS inline, no external dependencies" and the page renders correctly far more often.' },
          ],
        },
        {
          h2: 'Route 2: REST API (batch and automation)',
          body: [
            { p: 'Dozens of reports a day, or a CI job? Script it. In a JSON body the code field is called code:' },
            {
              code: '```bash\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Report</h1>\\",\\"title\\":\\"Weekly report\\",\\"expiresIn\\":0}"\n# => {"url":"https://openanthropic.com/view/a1b2c3d4e5","id":"a1b2c3d4e5","editToken":"edt_...","expiresAt":null}\n```' },
            {
              list: [
                'Anonymous access: 10 uploads per hour, 50 per day',
                'expiresIn is in seconds — pass 0 or omit it for a permanent link',
                'File uploads use -F "file=@x.html" and are capped at 2 MB',
                'End-to-end encryption is a paid feature; new accounts get a 3-day trial',
              ],
            },
          ],
        },
        {
          h2: 'Route 3: publish straight from an MCP agent',
          body: [
            { p: 'Connect the server to Claude or Cursor once, then just say "publish this HTML and give me the link".' },
            { code: '```bash\nclaude mcp add --transport http oh-my-share https://openanthropic.com/mcp\n```' },
            { code: '```json\n{"jsonrpc":"2.0","id":1,"method":"tools/call",\n "params":{"name":"upload","arguments":{"content":"<h1>Report</h1>","filename":"report.html","expiresIn":"30d"}}}\n```' },
            { note: 'The MCP upload tool defaults to 7d, so pass "permanent" explicitly if you want the link to last. Anonymous uploads need no credentials; only listing and deleting your own uploads require OAuth or an API key.' },
          ],
        },
        {
          h2: 'Field-tested advice for AI-generated pages',
          body: [
            {
              list: [
                'Insist on a single file — CDN dependencies break for the recipient',
                'Design mobile-first: shared links are usually opened on a phone',
                'For anything interactive, set a password or an expiry so it is not exposed forever',
                'Sign in and publish to the gallery when you want a permanent public page with view counts',
              ],
            },
            { note: 'Encrypted or password-protected uploads cannot be published to the gallery — encryption is a paid feature, and password-protected content is not meant to be public anyway.' },
          ],
        },
      ],
      faq: [
        ['How do I share HTML that ChatGPT or Claude generated?', 'Copy the source into the paste box, or call the REST API (field: code) / MCP upload tool once, then send the returned url.'],
        ['Do I need an account?', 'No. Anonymous uploads work; signing in is only needed to manage your own content, publish to the gallery, or use encryption.'],
        ['What are the limits?', '10 uploads per hour and 50 per day for anonymous users; 2 MB per file, 500 KB per pasted code.'],
        ['Will the platform modify my HTML?', 'No. /view/<id> renders your HTML as-is with no ads or framing, wrapped in a sandbox CSP.'],
      ],
      related: [
        { href: '/ai-html-publish', label: 'AI HTML publish page' },
        { href: '/guides/share-claude-artifacts', label: 'Share Claude artifacts' },
        { href: '/mcp-guide', label: 'MCP setup guide' },
      ],
    },
  },

  'share-claude-artifacts': {
    zh: {
      title: 'Claude Artifact 怎么分享给别人：一个链接搞定',
      metaTitle: '如何分享 Claude Artifact - 导出成链接 | Oh My Share',
      description:
        'Claude 生成的 Artifact 只能在对话里看？导出成 HTML 上传即可得到公开链接，含真实的上传参数、密码与有效期设置，以及 MCP 自动发布方式。',
      lead: 'Claude 的 Artifact 做得很漂亮，但默认只能在那个对话里打开。想发给同事、客户，或者丢进群里，最直接的办法就是把它变成一个链接。',
      sections: [
        {
          h2: '第一步：拿到 Artifact 的源码',
          body: [
            { p: '在 Claude 里点 Artifact 右上角的下载按钮（或切到代码视图复制全文），拿到的是一份完整的单文件 HTML。' },
          ],
        },
        {
          h2: '第二步：上传成链接',
          body: [
            {
              code: '```bash\ncurl -F "file=@artifact.html" https://openanthropic.com/api/upload\n# => {"url":"https://openanthropic.com/view/a1b2c3d4e5","id":"a1b2c3d4e5","editToken":"edt_...","expiresAt":null}\n```' },
            { p: '或者直接在网页上拖拽这个文件。十秒后你就有了链接，任何浏览器打开都是完整效果。' },
          ],
        },
        {
          h2: '第三步：按需要加保护',
          body: [
            {
              list: [
                '内部数据：设置访问密码，收到链接的人需要输入才能打开（最长 128 位）',
                '临时演示：网页端有效期选 7 天或 30 天，到期自动下线',
                'REST 调用时 expiresIn 单位是秒，传 0 或省略即永久',
                'MCP 调用默认 7 天，过期时间用 expiresIn 指定，可选 1h / 24h / 7d / 30d / 90d / permanent',
              ],
            },
            { note: '端到端加密（文件在浏览器里加密后再上传，服务器拿不到密钥）是付费功能，注册后可试用 3 天。加密内容无法发布到公开的作品广场。' },
          ],
        },
        {
          h2: '常见用法',
          body: [
            {
              list: [
                '把交互式图表发给不需要装任何软件的人',
                '把 HTML 小游戏发到群里，点开就能玩',
                '把 Claude 生成的报告变成可以随时查阅的网页',
                '接入 MCP 后让 Claude 自己上传并回传链接',
              ],
            },
          ],
        },
      ],
      faq: [
        ['Claude Artifact 可以分享给别人吗？', '可以。Artifact 本身就是单文件 HTML，导出后上传即可得到公开链接。'],
        ['分享链接需要登录吗？', '不需要，匿名上传即可。只有管理自己的内容才需要账号。'],
        ['分享后还能修改吗？', '可以。用返回的 editToken 打开 /edit/<id>?token=<editToken> 即可更新内容，链接地址保持不变。'],
        ['可以加密分享吗？', '可以，端到端加密是付费功能（新账号试用 3 天）。密钥只存在于生成的链接里，服务器无法读取内容。'],
      ],
      related: [
        { href: '/guides/share-ai-generated-html', label: '发布 AI 生成的 HTML' },
        { href: '/mcp-guide', label: 'MCP 接入指南' },
        { href: '/gallery', label: '作品广场' },
      ],
    },
    en: {
      title: 'How to share Claude artifacts with anyone, as a link',
      metaTitle: 'Share Claude Artifacts - Export an Artifact to a Link | Oh My Share',
      description:
        'Claude artifacts only open inside the chat. Export the generated HTML, upload it and get a public link — with the real upload parameters, password/expiry options and MCP automation.',
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
            {
              code: '```bash\ncurl -F "file=@artifact.html" https://openanthropic.com/api/upload\n# => {"url":"https://openanthropic.com/view/a1b2c3d4e5","id":"a1b2c3d4e5","editToken":"edt_...","expiresAt":null}\n```' },
            { p: 'Or drag the file onto the upload box. Either way you have a link that opens in any browser within seconds.' },
          ],
        },
        {
          h2: 'Step 3: add the right protection',
          body: [
            {
              list: [
                'Internal data: set an access password so viewers must type it (up to 128 characters)',
                'Temporary demo: pick a 7-day or 30-day expiry in the web form so it disappears on its own',
                'Over REST, expiresIn is in seconds — pass 0 or omit it for permanent',
                'Over MCP the default is 7d; set it explicitly with 1h / 24h / 7d / 30d / 90d / permanent',
              ],
            },
            { note: 'End-to-end encryption (encrypted in your browser before upload, key never reaches the server) is a paid feature with a 3-day trial for new accounts. Encrypted uploads cannot be published to the public gallery.' },
          ],
        },
        {
          h2: 'What people use this for',
          body: [
            {
              list: [
                'Sending an interactive chart to someone who will not install anything',
                'Dropping an HTML mini-game into a group chat',
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
        ['Can I update it after sharing?', 'Yes. Open /edit/<id>?token=<editToken> with the editToken returned at upload — the public URL stays the same.'],
        ['Can the link be encrypted?', 'Yes, as a paid feature (3-day trial for new accounts). The key exists only inside the link; the server cannot read the content.'],
      ],
      related: [
        { href: '/guides/share-ai-generated-html', label: 'Publish AI-generated HTML' },
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
        '把 PDF 换成可交互网页、把作品集做成链接、把活动邀请页发出去：无需服务器和域名，真实的上传参数、密码与有效期设置说明。',
      lead: '报告、作品集、活动邀请页——这些东西的共同点是「做一次、看很多次、发出去就行」，而不是要长期维护的应用。为它们单独买个服务器往往不划算，一个链接就够了。',
      sections: [
        {
          h2: '场景一：静态报告与数据看板',
          body: [
            { p: '把图表导出成一个 HTML 文件传上去，得到一个可交互的报告：对方能筛选、能切换图表，手机上也能看。比 PDF 链接实用得多。' },
            { note: '图表库走 CDN 的话，对方打开时需要联网。做正式报告时把库文件一起打进 zip 上传，保证离线可看；单个 HTML 文件上限 2 MB。' },
          ],
        },
        {
          h2: '场景二：作品集与简历页',
          body: [
            { p: '单文件作品集最省事：一个 HTML 承载全部内容，不用配域名、不用备案，改完直接更新同一个链接。' },
            {
              list: [
                '链接默认永久有效，可以直接写进简历或邮件签名',
                '用返回的 editToken 更新内容，链接地址始终不变',
                '登录后可以把作品发布到作品广场，获得公开作品页、浏览量与点赞',
              ],
            },
          ],
        },
        {
          h2: '场景三：一次性活动页与邀请函',
          body: [
            { p: '活动通知、请柬、投票页这类内容，最合适的是设置有效期：活动结束链接自动失效。网页端有效期四档为永久 / 1 小时 / 1 天 / 7 天 / 30 天。' },
            {
              code: '```bash\n# REST 调用：expiresIn 单位秒，604800 = 7 天\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Invitation</h1>\\",\\"expiresIn\\":604800,\\"password\\":\\"guest-only\\"}"\n```' },
          ],
        },
        {
          h2: '不想公开给别人看的内容',
          body: [
            { p: '上传时勾选端到端加密，文件会在你的浏览器里用随机密钥加密后再上传，服务器只存密文。密钥包含在生成的链接里，所以链接泄露即内容泄露——适合临时分享，不适合长期公开。加密是付费功能，注册后可试用 3 天。' },
            { p: '另外，带访问密码的内容同样无法发布到作品广场，因为密码保护本身就不适合公开。' },
          ],
        },
      ],
      faq: [
        ['没有服务器和域名可以发布网页吗？', '可以。上传后立刻得到一个公开链接，不需要服务器、域名或备案。'],
        ['对方需要安装什么吗？', '不需要。任何现代浏览器打开链接即可，手机和电脑都能正常显示，页面运行在沙箱里。'],
        ['链接能在活动结束后自动失效吗？', '可以。网页端设置有效期，或 REST 调用时传 expiresIn（秒）。'],
        ['能知道有多少人看过吗？', '登录后把作品发布到作品广场，页面会显示浏览次数与点赞数。'],
      ],
      related: [
        { href: '/guides/how-to-share-html-file-online', label: '如何在线分享 HTML 文件' },
        { href: '/gallery', label: '作品广场' },
        { href: '/demo', label: '产品演示' },
      ],
    },
    en: {
      title: 'Share static reports, portfolios and one-off pages as a link',
      metaTitle: 'Share Static Reports and Portfolios Without a Server | Oh My Share',
      description:
        'Swap the PDF for an interactive report, publish a portfolio as a link, or send out an event page: no server or domain needed, with the real upload parameters, password and expiry options.',
      lead: 'Reports, portfolios, invitation pages — they share one property: made once, viewed many times, then sent on. Standing up a server for that rarely makes sense. A link does.',
      sections: [
        {
          h2: 'Use case 1: static reports and dashboards',
          body: [
            { p: 'Export your chart output as one HTML file and upload it: the recipient gets an interactive report they can filter and switch between views, on a phone as well as a desktop. Far more useful than a PDF link.' },
            { note: 'If your chart library loads from a CDN, viewers need internet access. For reports that must work offline, bundle the library into a zip — the 2 MB per-file limit applies to HTML uploads.' },
          ],
        },
        {
          h2: 'Use case 2: portfolios and résumé pages',
          body: [
            { p: 'A single-file portfolio is the easiest kind to maintain: one HTML file carrying everything, no domain, no deployment — update it and the same link serves the new version.' },
            {
              list: [
                'Links are permanent by default, so they are safe to put in a résumé or email signature',
                'Update content with the returned editToken; the URL never changes',
                'Sign in and publish to the gallery for a public page with view and like counts',
              ],
            },
          ],
        },
        {
          h2: 'Use case 3: one-off event pages',
          body: [
            { p: 'Announcements, invitations, voting pages — give them an expiry so the link dies when the event is over. The web form offers permanent / 1 hour / 1 day / 7 days / 30 days.' },
            {
              code: '```bash\n# Over REST expiresIn is in seconds; 604800 = 7 days\ncurl -X POST https://openanthropic.com/api/upload \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"code\\":\\"<h1>Invitation</h1>\\",\\"expiresIn\\":604800,\\"password\\":\\"guest-only\\"}"\n```' },
          ],
        },
        {
          h2: 'When the content should not be public',
          body: [
            { p: 'Tick end-to-end encryption at upload: the file is encrypted in your browser with a random key before it reaches the server, which stores only ciphertext. The key lives inside the generated link, so a leaked link means leaked content — this suits temporary sharing, not permanent publication. Encryption is a paid feature with a 3-day trial for new accounts.' },
            { p: 'Note that password-protected uploads also cannot be published to the gallery, for the obvious reason.' },
          ],
        },
      ],
      faq: [
        ['Can I publish a page without a server or domain?', 'Yes. Uploading returns a public link immediately — no server, domain or filing involved.'],
        ['Does the recipient need to install anything?', 'No. Any modern browser opens the link, on mobile as well as desktop, and the page runs sandboxed.'],
        ['Can the link expire after an event?', 'Yes. Pick an expiry in the web form, or pass expiresIn (seconds) over REST.'],
        ['Can I see how many people viewed it?', 'Sign in and publish the work to the gallery — the page then shows view and like counts.'],
      ],
      related: [
        { href: '/guides/how-to-share-html-file-online', label: 'How to share an HTML file online' },
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
        return `<pre><code>${esc(block.code.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim())}</code></pre>`;
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
    jsonLd: [
      {
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
      faqJsonLd(copy.faq),
    ].filter(Boolean),
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
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      Vary: 'Accept-Language, Cookie',
    },
  });
}