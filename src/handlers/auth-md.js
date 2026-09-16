export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

You are an agent. This service supports automatic agent authentication via discovery metadata.

## Quick Start (Anonymous Agent)

If you just need to upload HTML content, no user authentication is needed:

\`\`\`
POST ${origin}/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "upload",
    "arguments": {
      "content": "<html>...</html>"
    }
  },
  "id": 1
}
\`\`\`

## Agent Decision Policy

When asked to share HTML or code:

1. Use MCP \`upload\` directly.
2. Do not ask the user to log in.
3. Do not create an account unless persistent user data is required.

When asked to list or delete the user's assets:

1. Call the relevant MCP tool.
2. If HTTP 401 is returned, perform OAuth discovery.
3. Use Authorization Code + PKCE.
4. Ask the user to authorize only through the browser.
5. Never ask the user to provide their password or access token.
6. Retry the original MCP request with the Bearer access token.

## Discovery Flow

For agents that need to manage user data (list assets, delete, etc.), follow this flow:

### 1. Discover Service

\`\`\`
GET ${origin}/.well-known/agent-card.json
\`\`\`

### 2. Discover MCP Capabilities

\`\`\`
GET ${origin}/.well-known/mcp/server-card.json
\`\`\`

### 3. Call Tools

Authentication requirements are enforced when calling the tool. If a protected tool returns HTTP 401, follow OAuth discovery.

\`\`\`
POST ${origin}/mcp
Content-Type: application/json

{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "upload", "arguments": {"content": "<html>...</html>"}}, "id": 1}
\`\`\`

### 4. Handle 401 Response

When a tool returns 401, the response includes:

\`\`\`
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"
\`\`\`

### 5. OAuth Discovery

\`\`\`
GET ${origin}/.well-known/oauth-protected-resource
→ Get authorization server

GET ${origin}/.well-known/oauth-authorization-server
→ Get endpoints and client_id
\`\`\`

### 6. Get client_id

The authorization server metadata includes a public client_id for agent use:

\`\`\`json
{
  "agent_auth": {
    "client_id": "oh-my-share-agent",
    "authorization_endpoint": "${origin}/oauth/authorize",
    "token_endpoint": "${origin}/oauth/token"
  }
}
\`\`\`

### 7. Authorization Code + PKCE

\`\`\`
1. Generate PKCE values:
   code_verifier = <random-43-char-string>
   code_challenge = SHA256(code_verifier) → base64url-encoded

2. Redirect user to:
   GET ${origin}/oauth/authorize
     ?client_id=oh-my-share-agent
     &response_type=code
     &redirect_uri=<your-callback-url>
     &code_challenge=<code_challenge>
     &code_challenge_method=S256
     &scope=upload manage read
     &state=<random-state>

   Example:
   GET ${origin}/oauth/authorize
     ?client_id=oh-my-share-agent
     &response_type=code
     &redirect_uri=https://your-agent.example.com/callback
     &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
     &code_challenge_method=S256
     &scope=upload%20manage%20read
     &state=abc123

3. User authorizes in browser

4. Exchange code for token:
   POST ${origin}/oauth/token
   Content-Type: application/json
   {
     "grant_type": "authorization_code",
     "code": "<authorization_code>",
     "redirect_uri": "<your-callback-url>",
     "client_id": "oh-my-share-agent",
     "code_verifier": "<code_verifier>"
   }
\`\`\`

**Note**: The \`redirect_uri\` must match exactly between the authorize request and the token exchange request.

### 8. Use Authenticated Tool

\`\`\`
POST ${origin}/mcp
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_assets",
    "arguments": {}
  },
  "id": 2
}
\`\`\`

## Agent Identity (Advanced/Legacy)

This is an advanced/legacy compatibility mechanism. It is not required for normal MCP usage.

For agents that need persistent identity across sessions, register an agent account:

\`\`\`
POST ${origin}/api/auth/register
Content-Type: application/json

{
  "email": "your-agent-id@agents.example.com",
  "password": "secure-password"
}
\`\`\`

Then authenticate with password grant (legacy, for compatibility only):

\`\`\`
POST ${origin}/oauth/token
Content-Type: application/json

{
  "grant_type": "password",
  "email": "your-agent-id@agents.example.com",
  "password": "secure-password"
}
\`\`\`

**Note**: Password grant is legacy. New agents should use Authorization Code + PKCE when possible.

## OAuth Endpoints

| Endpoint | Purpose |
|----------|---------|
| \`/.well-known/oauth-protected-resource\` | Resource metadata |
| \`/.well-known/oauth-authorization-server\` | Authorization server metadata |
| \`/oauth/authorize\` | Authorization endpoint |
| \`/oauth/token\` | Token endpoint |
| \`/oauth/google\` | Google social login |
| \`/oauth/github\` | GitHub social login |

## MCP Protocol

See [modelcontextprotocol.io](https://modelcontextprotocol.io) for protocol specification.

Supported versions: 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
