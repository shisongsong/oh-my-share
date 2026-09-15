export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

## Agent Registration

This service supports agent registration. AI agents can register and authenticate to access Oh My Share APIs.

## Registration Endpoint

\`\`\`
POST ${origin}/api/auth/register
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "secure-password"
}
\`\`\`

## Authentication Endpoint

\`\`\`
POST ${origin}/api/auth/login
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "secure-password"
}
\`\`\`

## Registration Methods

- **password**: Email and password registration

## Authentication Methods

- **password**: Email and password login
- **cookie**: Session-based authentication via HTTP cookies

## Agent Capabilities

After authentication, agents can:

- Upload HTML files: \`POST /api/upload\`
- List assets: \`GET /api/assets\`
- Manage content: \`GET /api/shares\`
- View content: \`GET /view/{id}\`

## OAuth Metadata

- Protected Resource: \`${origin}/.well-known/oauth-protected-resource\`
- Authorization Server: \`${origin}/.well-known/oauth-authorization-server\`

## Rate Limits

- Upload: 10/hour, 50/day per IP
- View: 500/hour per IP
- Auth: 20/hour per IP
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
