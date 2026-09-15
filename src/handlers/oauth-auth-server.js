export function handleOAuthAuthorizationServer(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    issuer: origin,
    authorization_endpoint: `${origin}/api/auth/login`,
    token_endpoint: `${origin}/api/auth/login`,
    registration_endpoint: `${origin}/api/auth/register`,
    response_types_supported: ['password'],
    grant_types_supported: ['password'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['upload', 'manage', 'read'],
    service_documentation: origin,
    agent_auth: {
      skill: 'oh-my-share',
      description: 'HTML and code sharing with end-to-end encryption',
      registration_uri: `${origin}/api/auth/register`,
      registration_methods: ['password'],
      register_uri: `${origin}/api/auth/register`,
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
