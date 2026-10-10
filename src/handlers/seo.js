import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { I18N } from '../i18n.js';

const BASE_URL = 'https://openanthropic.com';

export function notFoundPage(lang = 'en') {
  const t = I18N[lang] || I18N.en;
  const altLang = lang === 'zh' ? 'en' : 'zh';
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>404 - ${t.notFoundTitle} | Oh My Share</title>
<meta name="robots" content="noindex">
<style>${BASE_CSS}
.nf-hero {
  min-height: calc(100vh - var(--nav-height) - 260px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8) var(--space-5);
 }
 .nf-code {
  font-size: clamp(64px, 12vw, 104px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-4);
 }
 .nf-text {
  color: var(--color-text-secondary);
  font-size: 16px;
  margin-bottom: var(--space-6);
 }
a.lang-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
</style>
</head>
<body>
${renderNav(
  lang,
  '',
  `<a class="lang-switch" id="langBtn" href="?lang=${altLang}">${altLang === 'zh' ? '中文' : 'EN'}</a>
      <a class="account-button" id="accountBtn" href="/?lang=${lang}">${t.accountBtn}</a>`
)}
<main class="nf-hero">
  <div>
    <div class="nf-code">404</div>
    <p class="nf-text">${t.notFoundDesc}</p>
    <a href="/?lang=${lang}" class="btn">${t.backHome}</a>
  </div>
</main>
${renderFooter(lang)}
</body>
</html>`;
}

export function handleRobotsTxt() {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /assets/
Disallow: /upload
Disallow: /edit/
Disallow: /manage/

# Agent/LLM index: /llms.txt

# Allow sharing pages to be indexed (traffic sources)
User-agent: Googlebot
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml

# Oh My Share - Free HTML & Code Sharing Tool
# https://openanthropic.com`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function handleSitemap(env) {
  const urls = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
    // Gallery (public opt-in showcase)
    { loc: `${BASE_URL}/gallery`, priority: '0.9', changefreq: 'daily' },
    // SEO landing pages
    { loc: `${BASE_URL}/html-viewer`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/code-share`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/codepen-alternative`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/ai-html-publish`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${BASE_URL}/chatgpt-html-share`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/auth.md`, priority: '0.5', changefreq: 'weekly' },
    { loc: `${BASE_URL}/demo`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/mcp-guide`, priority: '0.8', changefreq: 'weekly' },
    // Legal (linked from every page footer)
    { loc: `${BASE_URL}/terms`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${BASE_URL}/privacy`, priority: '0.3', changefreq: 'yearly' },
  ];

  // Add recent published content (up to 100 pages)
  try {
    const db = env.DB;
    const recent = await db
      .prepare(`
        SELECT id, created_at 
        FROM files 
        WHERE encrypted = 0 AND password_hash IS NULL
          AND published_at > 0
          AND reported_at IS NULL
          AND (expires_at IS NULL OR expires_at = 0 OR expires_at > ?)
        ORDER BY created_at DESC 
        LIMIT 100
      `)
      .bind(Math.floor(Date.now() / 1000))
      .all();

    for (const file of recent.results || []) {
      urls.push({
        loc: `${BASE_URL}/gallery/${file.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: new Date(file.created_at * 1000).toISOString().split('T')[0],
      });
    }
  } catch (e) {
    console.error('Sitemap DB error:', e);
  }

  const urlEntries = urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
