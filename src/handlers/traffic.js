const BOT_PATTERN = /bot|crawl|spider|slurp|spider|preview|monitor|scan|check|curl|wget|python-requests|axios|node-fetch|headless|lighthouse|pingdom|uptime|feed|validator/i;

const TRACKED_PATHS = new Set([
  '/',
  '/gallery',
  '/html-viewer',
  '/code-share',
  '/codepen-alternative',
  '/ai-html-publish',
  '/chatgpt-html-share',
  '/auth.md',
  '/report',
  '/abuse',
]);

function normalizePath(pathname) {
  if (TRACKED_PATHS.has(pathname)) return pathname;
  if (pathname.startsWith('/view/')) return '/view';
  if (pathname === '/extension.zip') return '/extension.zip';
  if (pathname === '/sitemap.xml') return '/sitemap.xml';
  if (pathname === '/robots.txt') return '/robots.txt';
  return '/other';
}

function refererHost(request) {
  const referer = request.headers.get('Referer') || request.headers.get('referrer') || '';
  if (!referer) return '';
  try {
    const host = new URL(referer).host;
    return host === new URL(request.url).host ? '' : host;
  } catch {
    return '';
  }
}

export function recordPageView(request, env, response) {
  if (request.method !== 'GET') return null;
  if (!response || response.status !== 200) return null;

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return null;

  const userAgent = request.headers.get('User-Agent') || '';
  if (BOT_PATTERN.test(userAgent)) return null;

  const url = new URL(request.url);
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const path = normalizePath(url.pathname);
  const referer = refererHost(request);

  if (!env.DB) return null;

  return env.DB.prepare(
    `INSERT INTO site_visits (day, path, referer, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(day, path, referer) DO UPDATE SET count = count + 1`
  )
    .bind(day, path, referer)
    .run()
    .catch(() => null);
}
