export function handleOAuthAuthorizationServer(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/api/auth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'password'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['upload', 'manage', 'read'],
    service_documentation: `${origin}/auth.md`,
    code_challenge_methods_supported: ['S256'],
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
