import { queryGallery } from './gallery.js';

const BASE_URL = 'https://openanthropic.com';

function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function handleFeed(request, env) {
  let items = [];
  try {
    const data = await queryGallery(env, { sort: 'new', perPage: 20 });
    items = data.items || [];
  } catch (e) {
    console.error('Feed query error:', e);
  }

  const now = new Date().toUTCString();
  const entries = items
    .map((item) => {
      const title = item.title || item.filename || `Work ${item.id}`;
      const link = `${BASE_URL}/gallery/${item.id}`;
      const desc = item.description || '';
      const published = item.published_at
        ? new Date(Number(item.published_at) * 1000).toUTCString()
        : now;
      return `    <item>
      <title>${escXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${published}</pubDate>
      <description>${escXml(desc)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Oh My Share Gallery</title>
    <link>${BASE_URL}/gallery</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Latest HTML works published to the Oh My Share gallery.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
