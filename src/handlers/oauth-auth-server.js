export function handleOAuthAuthorizationServer(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    issuer: origin,
    token_endpoint: `${origin}/api/auth/login`,
    registration_endpoint: `${origin}/api/auth/register`,
    response_types_supported: ['password'],
    grant_types_supported: ['password'],
    scopes_supported: ['upload', 'manage', 'read'],
    agent_auth: {
      skill: `${origin}/auth.md`,
      identity_endpoint: `${origin}/api/auth/register`,
      identity_types_supported: ['anonymous', 'service_auth'],
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
