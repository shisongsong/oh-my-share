export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

## Agent Registration

This service supports agent registration for AI agents and automated tools.

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

- password: Email and password registration via POST /api/auth/register

## Authentication Methods

- password: Email and password login via POST /api/auth/login
- cookie: Session-based authentication via HTTP cookies

## Agent Auth

\`\`\`json
{
  "skill": "${origin}/auth.md",
  "register_uri": "${origin}/api/auth/register",
  "register_methods": ["password"],
  "auth_uri": "${origin}/api/auth/login",
  "auth_methods": ["password"]
}
\`\`\`

## Flow Metadata

### ID-JAG

\`\`\`json
{
  "identity_types_supported": ["identity_assertion"],
  "identity_assertion": {
    "assertion_types_supported": ["urn:ietf:params:oauth:token-type:id-jag"],
    "credential_types_supported": ["jwt"]
  },
  "events_supported": ["identity_assertion.created", "identity_assertion.revoked"]
}
\`\`\`

## OAuth Metadata

- Protected Resource: ${origin}/.well-known/oauth-protected-resource
- Authorization Server: ${origin}/.well-known/oauth-authorization-server

## Capabilities

After authentication, agents can:
- Upload HTML files: POST /api/upload
- List assets: GET /api/assets
- Manage content: GET /api/shares
- View content: GET /view/{id}

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
