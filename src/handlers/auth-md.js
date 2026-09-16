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

### 3. Check Tool Requirements

Call \`tools/list\` to see which tools require authentication:

\`\`\`
POST ${origin}/mcp
Content-Type: application/json

{"jsonrpc": "2.0", "method": "tools/list", "id": 1}
\`\`\`

Tools requiring authentication return 401:
- \`list_assets\` - List user's uploaded assets
- \`delete\` - Delete an asset

Tools that work without authentication:
- \`upload\` - Upload HTML content
- \`view\` - View shared content
- \`get_info\` - Get service information

### 4. Authenticate (if needed)

When a tool returns 401, the response includes:

\`\`\`
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"
\`\`\`

Follow the OAuth flow:

\`\`\`
GET ${origin}/.well-known/oauth-protected-resource
→ Get authorization server

GET ${origin}/.well-known/oauth-authorization-server
→ Get endpoints

GET ${origin}/oauth/authorize?client_id=...&response_type=code&code_challenge=...&code_challenge_method=S256&scope=upload manage read
→ User authorizes

POST ${origin}/oauth/token
{"grant_type": "authorization_code", "code": "...", "code_verifier": "..."}
→ Get access_token
\`\`\`

### 5. Use Authenticated Tool

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

## Agent Identity (Optional)

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
