import { renderFooter, hreflangLinks, BASE_CSS } from './theme.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escape characters that would let a title or body break out of the
// application/ld+json script element. `<` is the only one strictly required
// by the HTML parser, the rest keep the JSON safe for any downstream consumer.
function serializeJsonLd(content) {
  const json = typeof content === 'string' ? content : JSON.stringify(content);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function scriptTag(content) {
  return `<script type="application/ld+json">\n${serializeJsonLd(content)}\n</script>`;
}

// Shared HTML document shell. Every full-page handler composes its head and body
// through this so doctype/meta/OG/style/footer structure stays identical everywhere.
//
// Options:
//   lang          'zh' | 'en'  (html lang uses zh-CN for zh)
//   htmlLang      override the <html lang> value (e.g. from custom translations)
//   title         page title (escaped)
//   description   meta description (escaped)
//   robots        robots meta value, e.g. 'noindex,follow'
//   canonical     full canonical URL
//   origin        origin used for hreflang (defaults to canonical's origin)
//   hreflangPath  path for hreflang alternates; omitted -> no hreflang links
//   jsonLd        object, already-serialized JSON string, or an array of either
//   breadcrumbs   [{ name, path }] rendered as a BreadcrumbList (home item included)
//   og            emit the Open Graph block (requires canonical for og:url)
//   ogType        og:type (default 'website')
//   ogLocale      include og:locale (default true when og is on)
//   twitter       emit the twitter:card block
//   styles        extra CSS strings appended after BASE_CSS
//   includeBaseCss  prepend the shared BASE_CSS (default true)
//   headExtra     raw HTML appended at the end of <head>
//   nav           raw HTML inserted at the start of <body>
//   body          main content HTML
//   footer        true (default) -> renderFooter(lang), string -> raw, false -> none
//   scripts       JS strings wrapped in <script> tags, emitted before </body>
//   bodyAttrs     extra attributes for <body> (e.g. `class="x"`)
export function renderDocument({
  lang,
  htmlLang,
  title,
  description,
  robots,
  canonical,
  origin,
  hreflangPath,
  jsonLd,
  breadcrumbs,
  og = false,
  ogType = 'website',
  ogLocale = true,
  ogTitle,
  twitter = false,
  twitterTitle,
  ogImage,
  styles = [],
  includeBaseCss = true,
  headExtra = '',
  nav = '',
  body = '',
  footer = true,
  scripts = [],
  bodyAttrs = '',
}) {
  const langValue = htmlLang || (lang === 'zh' ? 'zh-CN' : 'en');
  // Every language version self-canonicalizes: pointing the zh page at the bare
  // (en) URL would stop it from ever ranking on its own in zh searches. The
  // hreflang links below keep the two versions tied together.
  const canonicalUrl = canonical && lang === 'zh' && !/[?&]lang=/.test(canonical)
    ? `${canonical}${canonical.includes('?') ? '&' : '?'}lang=zh`
    : canonical;
  const ogUrl = canonicalUrl || origin || '';
  const ogImageUrl = ogImage || (ogUrl ? `${new URL(ogUrl).origin}/og-image.png` : '');
  const styleList = [
    ...(includeBaseCss ? [BASE_CSS] : []),
    ...(Array.isArray(styles) ? styles : [styles]),
  ].filter(Boolean);

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="theme-color" content="#f4efe4" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#171410" media="(prefers-color-scheme: dark)">',
    '<link rel="icon" type="image/svg+xml" href="/icon.svg">',
    `<title>${esc(title)}</title>`,
    description ? `<meta name="description" content="${esc(description)}">` : '',
    robots ? `<meta name="robots" content="${esc(robots)}">` : '',
    canonicalUrl ? `<link rel="canonical" href="${esc(canonicalUrl)}">` : '',
    hreflangPath ? hreflangLinks(origin || (canonicalUrl ? new URL(canonicalUrl).origin : ''), hreflangPath) : '',
    jsonLd
      ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean).map(scriptTag).join('\n')
      : '',
    breadcrumbs && breadcrumbs.length
      ? scriptTag({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: `${canonicalUrl ? new URL(canonicalUrl).origin : origin}${crumb.path}`,
          })),
        })
      : '',
    og
      ? `<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(ogTitle || title)}">
${description ? `<meta property="og:description" content="${esc(description)}">\n` : ''}${ogUrl ? `<meta property="og:url" content="${esc(ogUrl)}">\n` : ''}${ogImageUrl ? `<meta property="og:image" content="${esc(ogImageUrl)}">\n` : ''}${ogLocale ? `<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">` : ''}`
      : '',
    twitter
      ? `<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(twitterTitle || ogTitle || title)}">
${description ? `<meta name="twitter:description" content="${esc(description)}">\n` : ''}${ogImageUrl ? `<meta name="twitter:image" content="${esc(ogImageUrl)}">` : ''}`
      : '',
    styleList.length ? `<style>\n${styleList.join('\n')}\n</style>` : '',
    headExtra,
  ]
    .filter(Boolean)
    .join('\n');

  const footerHtml = footer === true ? renderFooter(lang) : typeof footer === 'string' ? footer : '';
  const scriptHtml = (Array.isArray(scripts) ? scripts : [scripts])
    .filter(Boolean)
    .map((code) => `<script>${code}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${esc(langValue)}">
<head>
${head}
</head>
<body${bodyAttrs ? ` ${bodyAttrs}` : ''}>
${nav}
${body}
${footerHtml}
${scriptHtml}
</body>
</html>`;
}
