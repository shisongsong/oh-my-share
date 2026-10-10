// Submit sitemap URLs to IndexNow (Bing / Yandex / Seznam / Naver).
// Runs after every deploy. Key file is served at /{key}.txt by the worker.
// Fail-soft: a ping outage must never break a deploy.
const KEY = 'dab46c9c750b7c083d5723b8ed9653a5';
const HOST = 'openanthropic.com';
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function submitBatch(urls) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  console.log(`IndexNow: submitted ${urls.length} URLs — HTTP ${response.status}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(text.slice(0, 300));
  }
}

try {
  const sitemap = await fetch(SITEMAP);
  if (!sitemap.ok) {
    throw new Error(`sitemap fetch failed: HTTP ${sitemap.status}`);
  }
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  // IndexNow allows 10,000 URLs per request
  for (let i = 0; i < urls.length; i += 5000) {
    await submitBatch(urls.slice(i, i + 5000));
  }
} catch (error) {
  console.error('IndexNow ping failed:', error?.message || error);
}
