export function handleOAuthProtectedResource(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    resource: origin,
    resource_name: 'Oh My Share',
    authorization_servers: [origin],
    scopes_supported: ['upload', 'manage', 'read'],
    bearer_methods_supported: ['header'],
  };

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
