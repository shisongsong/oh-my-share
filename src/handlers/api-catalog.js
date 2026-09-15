export function handleApiCatalog(request) {
  const origin = new URL(request.url).origin;

  const linkset = [
    {
      anchor: `${origin}/api/upload`,
      'service-desc': {
        href: `${origin}/robots.txt`,
        title: 'Oh My Share API',
        type: 'application/openapi+json',
      },
      'service-doc': {
        href: origin,
        title: 'Oh My Share - HTML & Code Sharing',
      },
    },
    {
      anchor: `${origin}/api/auth/login`,
      'service-desc': {
        href: `${origin}/robots.txt`,
        title: 'Authentication API',
        type: 'application/openapi+json',
      },
      'service-doc': {
        href: origin,
        title: 'Oh My Share Authentication',
      },
    },
    {
      anchor: `${origin}/api/assets`,
      'service-desc': {
        href: `${origin}/robots.txt`,
        title: 'Assets API',
        type: 'application/openapi+json',
      },
      'service-doc': {
        href: origin,
        title: 'Oh My Share Assets',
      },
    },
  ];

  return new Response(JSON.stringify({ linkset }), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
