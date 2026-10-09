import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';

const BASE_URL = 'https://openanthropic.com';
const UPDATED = '2026-10-09';

const CONTENT = {
  terms: {
    en: {
      title: 'Terms of Service',
      intro: `These Terms of Service ("Terms") govern your use of Oh My Share (${BASE_URL}) (the "Service"). By using the Service you agree to these Terms. Last updated: ${UPDATED}.`,
      sections: [
        ['The service', 'Oh My Share is a free, no-signup tool for sharing single-file HTML pages and code snippets, built on Cloudflare Workers. Core features are provided free of charge; optional paid plans add encryption and higher limits.'],
        ['Your content', 'You retain all rights to the content you upload. You grant the Service only the technical permission to store, render and (when you choose to publish to the Gallery) publicly display that content for as long as it remains on the Service.'],
        ['Acceptable use', 'You may not upload content that is illegal, malware, phishing, sexual content involving minors, or that infringes the rights of others. Abuse of the Service (spam, scraping beyond published rate limits, attempted circumvention of access controls) is prohibited.'],
        ['Encryption & trial', 'End-to-end encryption is optional. When enabled, content is encrypted in your browser and the server never receives the key. A free 3-day encryption trial is granted on registration. Paid plans are billed manually as described at checkout.'],
        ['Availability & changes', 'The Service may be changed, suspended or discontinued at any time. Shared links may expire according to the expiry you selected. We may remove content that violates these Terms or applicable law.'],
        ['Disclaimer & liability', 'The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect or consequential damages arising from your use of the Service.'],
        ['Contact', `Questions about these Terms: 1400875096@qq.com. Abuse reports: ${BASE_URL}/abuse.`],
      ],
    },
    zh: {
      title: '服务条款',
      intro: `本服务条款（"条款"）规范您对 Oh My Share（${BASE_URL}）（下称"本服务"）的使用。使用本服务即表示您同意本条款。最后更新：${UPDATED}。`,
      sections: [
        ['服务内容', 'Oh My Share 是基于 Cloudflare Workers 构建的免费、无需注册的单文件 HTML 页面与代码片段分享工具。核心功能永久免费；可选付费方案提供加密与更高配额。'],
        ['您的内容', '您保留所上传内容的全部权利。您仅授予本服务为提供分享所必需的存储、渲染权限；当您选择发布到作品广场时，还授权公开展示，直至内容从本服务移除。'],
        ['使用规范', '您不得上传违法内容、恶意软件、钓鱼页面、涉及未成年人的性内容，或侵犯他人权利的内容。禁止滥用本服务（垃圾信息、超出已公布速率限制的抓取、绕过访问控制等行为）。'],
        ['加密与试用', '端到端加密为可选功能。启用后内容在您的浏览器内加密，服务器不会收到密钥。注册即赠送 3 天加密试用；付费方案按结算页说明人工开通。'],
        ['可用性与变更', '本服务可能随时调整、暂停或终止。分享链接将按您选择的有效期过期。我们可能移除违反本条款或适用法律的内容。'],
        ['免责声明与责任限制', '本服务按"现状"提供，不附带任何明示或默示保证。在法律允许的最大范围内，我们不对因使用本服务产生的任何间接或后果性损失承担责任。'],
        ['联系方式', `条款相关问题：1400875096@qq.com。内容举报：${BASE_URL}/abuse。`],
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy',
      intro: `This Privacy Policy explains what data Oh My Share (${BASE_URL}) collects and how it is used. Last updated: ${UPDATED}.`,
      sections: [
        ['Data we store', '— Uploaded content: stored in Cloudflare R2; visible only via its link (or publicly in the Gallery if you publish it). — Accounts: email address and password hash (or OAuth provider identifier). — Visit statistics: hashed IP, user agent, country and timestamp per view, used for the per-link stats page. — Rate limiting: short-lived request counters keyed by hashed IP.'],
        ['Cookies', 'Essential cookies only: a session cookie when signed in, a language preference cookie (osh_lang), and a per-link unlock cookie when you enter a content password. We do not use third-party advertising or tracking cookies.'],
        ['Third parties', 'Content is hosted on Cloudflare (Workers, D1, R2). Sign-in may use Google or GitHub OAuth; we receive only your email and provider identity. No data is sold or shared for advertising.'],
        ['Retention', 'Content follows the expiry you selected when uploading (or permanent until you delete it). Visit statistics are aggregated daily and retained for analytics. Rate-limit counters expire within hours.'],
        ['Your rights', `You can delete your content at any time via the edit/manage link included when sharing, or by signing in. For account deletion or data requests, email 1400875096@qq.com.`],
        ['Contact', `Privacy questions: 1400875096@qq.com. Abuse reports: ${BASE_URL}/abuse.`],
      ],
    },
    zh: {
      title: '隐私政策',
      intro: `本隐私政策说明 Oh My Share（${BASE_URL}）收集哪些数据及其用途。最后更新：${UPDATED}。`,
      sections: [
        ['我们存储的数据', '— 上传内容：存储于 Cloudflare R2，仅通过分享链接可见（发布到作品广场则公开可见）。— 账户：邮箱地址与密码哈希（或 OAuth 提供商标识）。— 访问统计：每次访问的哈希 IP、User-Agent、国家/地区与时间戳，用于单链接统计页。— 频率限制：以哈希 IP 为键的短期请求计数。'],
        ['Cookie', '仅使用必要 Cookie：登录会话、语言偏好（osh_lang）、以及输入内容密码后的单链接解锁 Cookie。我们不使用第三方广告或跟踪 Cookie。'],
        ['第三方', '内容托管于 Cloudflare（Workers、D1、R2）。登录可使用 Google 或 GitHub OAuth，我们仅接收邮箱与提供商身份信息。不出售数据，不用于广告共享。'],
        ['数据保留', '内容按上传时选择的有效期保留（或在您删除前永久保留）。访问统计按日聚合后保留用于分析。频率限制计数数小时内过期。'],
        ['您的权利', '您可随时通过分享时附带的编辑/管理链接删除内容，或登录账户管理。账户注销与数据请求请发送邮件至 1400875096@qq.com。'],
        ['联系方式', `隐私相关问题：1400875096@qq.com。内容举报：${BASE_URL}/abuse。`],
      ],
    },
  },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function handleLegalPage(kind, request) {
  const lang = resolveLang(request);
  const page = CONTENT[kind] && CONTENT[kind][lang]
    ? CONTENT[kind][lang]
    : (CONTENT[kind] && CONTENT[kind].en);
  const otherLang = lang === 'zh' ? 'en' : 'zh';
  const sectionsHtml = page.sections
    .map(([heading, body]) => `<section class="legal-section"><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${esc(page.title)} | Oh My Share</title>
<meta name="description" content="${esc(page.intro.slice(0, 160))}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE_URL}/${kind}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:title" content="${esc(page.title)} | Oh My Share">
<meta property="og:description" content="${esc(page.intro.slice(0, 160))}">
<meta property="og:url" content="${BASE_URL}/${kind}">
<meta property="og:image" content="${BASE_URL}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<style>${BASE_CSS}
.legal-main {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-5) var(--space-10);
}
.legal-main h1 {
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-4);
}
.legal-intro {
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.7;
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-hairline);
  margin-bottom: var(--space-6);
}
.legal-section { margin-bottom: var(--space-6); }
.legal-section h2 {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-2);
}
.legal-section p {
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.75;
}
.legal-lang { margin-top: var(--space-6); font-size: 14px; }
.legal-lang a { color: var(--color-link); text-decoration: none; }
</style>
</head>
<body>
${renderNav(
  lang,
  '',
  `<a class="lang-switch" href="/${kind}?lang=${otherLang}">${otherLang === 'zh' ? '中文' : 'EN'}</a>
   <a class="account-button" href="/">${lang === 'zh' ? '首页' : 'Home'}</a>`
)}
<main class="legal-main">
  <h1>${esc(page.title)}</h1>
  <p class="legal-intro">${esc(page.intro)}</p>
  ${sectionsHtml}
  <p class="legal-lang"><a href="/${kind}?lang=${otherLang}">${otherLang === 'zh' ? '切换到中文版' : 'Switch to English'}</a></p>
</main>
${renderFooter(lang)}
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
