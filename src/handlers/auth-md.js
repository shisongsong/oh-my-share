export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

You are an agent. This service supports **agentic registration**: discover → register → exchange for an access_token → call API. Follow the steps in order; do not skip ahead.

## Step 1 — Discover

### 1a. Fetch the Protected Resource Metadata

\`\`\`
GET ${origin}/.well-known/oauth-protected-resource
\`\`\`

Response:

\`\`\`json
{
  "resource": "${origin}",
  "resource_name": "Oh My Share",
  "authorization_servers": ["${origin}"],
  "scopes_supported": ["upload", "manage", "read"],
  "bearer_methods_supported": ["header"]
}
\`\`\`

### 1b. Fetch the Authorization Server metadata

\`\`\`
GET ${origin}/.well-known/oauth-authorization-server
\`\`\`

Response:

\`\`\`json
{
  "issuer": "${origin}",
  "token_endpoint": "${origin}/api/auth/login",
  "registration_endpoint": "${origin}/api/auth/register",
  "grant_types_supported": ["password"],
  "agent_auth": {
    "skill": "${origin}/auth.md",
    "identity_endpoint": "${origin}/api/auth/register",
    "identity_types_supported": ["anonymous", "service_auth"]
  }
}
\`\`\`

## Step 2 — Pick a method

1. **You have a user email** → service_auth
2. **You have neither** → anonymous

## Step 3 — Register

### service_auth

\`\`\`
POST ${origin}/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
\`\`\`

Response (200):

\`\`\`json
{
  "email": "user@example.com",
  "message": "Registration successful"
}
\`\`\`

### anonymous

\`\`\`
POST ${origin}/api/auth/register
Content-Type: application/json

{
  "email": "anonymous-agent@example.com",
  "password": "random-generated-password"
}
\`\`\`

## Step 4 — Authenticate

\`\`\`
POST ${origin}/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
\`\`\`

Response: Set-Cookie with session token.

## Step 5 — Use the session

Present the session cookie in subsequent requests:

\`\`\`
GET ${origin}/api/assets
Cookie: session=<session_token>
\`\`\`

## Capabilities

After authentication, agents can:
- Upload HTML files: \`POST /api/upload\`
- List assets: \`GET /api/assets\`
- Manage content: \`GET /api/shares\`
- View content: \`GET /view/{id}\`

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
