import { detectLang } from '../i18n.js';
import { renderPage } from '../ui/page.js';

export async function handleHome(request) {
  const lang = detectLang(request);
  const html = renderPage(lang);
  const origin = new URL(request.url).origin;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Accept-Language, CF-IPCountry',
      Link: `</.well-known/api-catalog>; rel="api-catalog"`,
    },
  });
}