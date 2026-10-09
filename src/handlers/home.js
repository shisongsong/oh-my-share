import { resolveLang } from '../i18n.js';
import { renderPage } from '../ui/page.js';

export async function handleHome(request) {
  const lang = resolveLang(request);
  const html = renderPage(lang);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Accept-Language, CF-IPCountry',
      Link: `</.well-known/api-catalog>; rel="api-catalog"`,
    },
  });
}