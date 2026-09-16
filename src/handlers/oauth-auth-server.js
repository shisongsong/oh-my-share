export function handleOAuthAuthorizationServer(request) {
  const origin = new URL(request.url).origin;

  const metadata = {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'password'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['upload', 'manage', 'read'],
    service_documentation: `${origin}/auth.md`,
    code_challenge_methods_supported: ['S256'],
    // ChatGPT Apps SDK compatibility
    chatgpt_compatible: true,
    redirect_uris_supported: [
      'https://chatgpt.com/robots.txt',
    ],
    // Agent-specific authentication metadata
    agent_auth: {
      client_id: 'oh-my-share-agent',
      skill: `${origin}/auth.md`,
      identity_endpoint: `${origin}/api/auth/register`,
      identity_types_supported: ['anonymous', 'service_auth'],
    },
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
