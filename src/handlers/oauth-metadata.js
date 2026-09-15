export function handleOAuthProtectedResource(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ['upload', 'manage', 'read'],
    bearer_methods_supported: ['header'],
    agent_auth: {
      skill: `${origin}/auth.md`,
      description: 'HTML and code sharing with end-to-end encryption',
      registration_uri: `${origin}/api/auth/register`,
      registration_methods: ['password'],
      auth_uri: `${origin}/api/auth/login`,
      auth_methods: ['password'],
    },
  };

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
