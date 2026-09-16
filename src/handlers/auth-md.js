export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

You are an agent. This service supports **agentic registration** and **OAuth 2.0** authentication. Follow the steps in order; do not skip ahead.

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
  "authorization_endpoint": "${origin}/oauth/authorize",
  "token_endpoint": "${origin}/oauth/token",
  "registration_endpoint": "${origin}/api/auth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "password"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["upload", "manage", "read"],
  "code_challenge_methods_supported": ["S256"],
  "agent_auth": {
    "skill": "${origin}/auth.md",
    "identity_endpoint": "${origin}/api/auth/register",
    "identity_types_supported": ["anonymous", "service_auth"]
  }
}
\`\`\`

## Step 2 — Pick a method

1. **You have a user email** → service_auth (Password Grant)
2. **You have neither** → anonymous (Password Grant)
3. **Interactive user** → Authorization Code + PKCE

## Step 3 — Register (if new user)

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
  "email": "anonymous-agent-<random>@example.com",
  "password": "random-generated-password"
}
\`\`\`

## Step 4 — Authenticate

### Option A: Password Grant (for agents)

\`\`\`
POST ${origin}/oauth/token
Content-Type: application/json

{
  "grant_type": "password",
  "email": "user@example.com",
  "password": "secure-password"
}
\`\`\`

Response (200):

\`\`\`json
{
  "access_token": "your-access-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "upload manage read"
}
\`\`\`

### Option B: Authorization Code + PKCE (for interactive users)

#### B1. Generate PKCE values

\`\`\`
code_verifier = <random-43-char-string>
code_challenge = SHA256(code_verifier) → base64url-encoded
\`\`\`

#### B2. Redirect user to authorization endpoint

\`\`\`
GET ${origin}/oauth/authorize
  ?client_id=your-client-id
  &redirect_uri=https://your-app.com/callback
  &response_type=code
  &code_challenge=<code_challenge>
  &code_challenge_method=S256
  &scope=upload manage read
  &state=<random-state>
\`\`\`

#### B3. User logs in and authorizes

User is redirected to \`/oauth/login\` page where they can:
- Sign in with Google
- Sign in with GitHub
- Login with email/password

After authorization, user is redirected back with authorization code:

\`\`\`
https://your-app.com/callback?code=<authorization_code>&state=<state>
\`\`\`

#### B4. Exchange code for access token

\`\`\`
POST ${origin}/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "<authorization_code>",
  "redirect_uri": "https://your-app.com/callback",
  "client_id": "your-client-id",
  "code_verifier": "<code_verifier>"
}
\`\`\`

Response (200):

\`\`\`json
{
  "access_token": "your-access-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "upload manage read"
}
\`\`\`

## Step 5 — Call API

Use the access token in the Authorization header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### Upload content

\`\`\`
POST ${origin}/api/upload
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "<html>...</html>",
  "filename": "my-page.html"
}
\`\`\`

### List assets

\`\`\`
GET ${origin}/api/assets
Authorization: Bearer <access_token>
\`\`\`

### Delete asset

\`\`\`
DELETE ${origin}/api/assets/<id>
Authorization: Bearer <access_token>
\`\`\`

## MCP Integration

For MCP (Model Context Protocol) integration, see the MCP server card:

\`\`\`
GET ${origin}/.well-known/mcp/server-card.json
\`\`\`

MCP endpoint: \`POST ${origin}/mcp\`

### MCP OAuth Flow

1. Call MCP tool without authentication
2. Receive 401 with \`WWW-Authenticate: Bearer resource_metadata="..."\`
3. Follow OAuth flow above to get access token
4. Call MCP tool with \`Authorization: Bearer <token>\` header

## Social Login

This service supports OAuth login via:
- **Google**: \`GET ${origin}/oauth/google\`
- **GitHub**: \`GET ${origin}/oauth/github\`

These are for interactive user login in web browsers, not for agent API access.

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
