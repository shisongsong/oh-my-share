export function handleAuthMd(request) {
  const origin = new URL(request.url).origin;

  const content = `# auth.md

You are an agent. This service supports automatic agent authentication via discovery metadata.

Human-readable guide with screenshots: ${origin}/mcp-guide

## Transport Requirements

The MCP endpoint is a single Streamable HTTP URL:

\`\`\`
POST ${origin}/mcp
Accept: application/json, text/event-stream
Content-Type: application/json
\`\`\`

- Send both \`application/json\` and \`text/event-stream\` in \`Accept\`.
- Requests without an \`id\` (notifications) are answered with \`202\` and an empty body.
- JSON-RPC errors are returned with HTTP \`200\` and an \`error\` object. Do **not** treat a
  4xx status as a protocol error.
- This server pushes no server-initiated messages, so \`GET ${origin}/mcp\` returns
  \`405\` — POST only.

Supported protocol versions: 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26.

## Quick Start (Anonymous Agent)

If you just need to upload HTML content, no user authentication is needed:

\`\`\`
POST ${origin}/mcp
Accept: application/json, text/event-stream
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

## Tool Reference

| Tool | Auth | Arguments | Notes |
|------|------|-----------|-------|
| \`upload\` | anonymous | \`content\`*, \`filename\`, \`language\`, \`password\`, \`expiresIn\` | Returns a share URL |
| \`view\` | anonymous | \`id\`* | Read shared content by id |
| \`get_info\` | anonymous | — | Server version and limits |
| \`search_gallery\` | anonymous | \`query\`, \`sort\`, \`page\`, \`limit\` (\u2264 20) | Search public works |
| \`list_assets\` | **required** | — | List the caller's uploads |
| \`delete\` | **required** | \`id\`* | Delete one of the caller's uploads |

\`*\` = required. Rate limits are per IP: 10 uploads/hour and 50/day, shared by the MCP
\`upload\` tool and the REST upload endpoint. A limited upload is not a protocol error —
it returns a normal result whose text contains \`"error": "Rate limit exceeded ... "\`
with a \`Retry in <n>s\` hint.

Always discover the live schemas with \`tools/list\` before building arguments.

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

If you are an automated system with no browser available (CI, cron, registry health
checks), use a static API key instead — see step 9.

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

Protected tools answer with a JSON-RPC error body plus an OAuth challenge header:

\`\`\`
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"
Content-Type: application/json

{"jsonrpc":"2.0","error":{"code":-32001,"message":"Authentication required","data":{"resource_metadata":"${origin}/.well-known/oauth-protected-resource"}},"id":2}
\`\`\`

### 5. OAuth Discovery

\`\`\`
GET ${origin}/.well-known/oauth-protected-resource
→ Get authorization server

GET ${origin}/.well-known/oauth-authorization-server
→ Get authorization_endpoint and token_endpoint
\`\`\`

### 6. Choose a client_id

**There is no pre-registered client and the metadata contains no \`client_id\` field.**
This server is a public client (\`token_endpoint_auth_methods_supported: ["none"]\`)
and accepts any \`client_id\` you choose. Pick a stable identifier for yourself (for
example \`my-agent\`) and reuse the *same* value for the authorize and token calls —
it is stored with the authorization code and must match at exchange time.

The same applies to \`redirect_uri\`: use any URL you control. It is recorded with the
authorization code and must be byte-identical when exchanging the code. Never guess a
value that was not supplied by your own client.

Required parameters for the authorization request: \`client_id\`, \`redirect_uri\`,
\`code_challenge\` (PKCE is mandatory), \`code_challenge_method=S256\`,
\`response_type=code\`, and optionally \`scope\` + \`state\`.

### 7. Authorization Code + PKCE

\`\`\`
1. Generate PKCE values:
   code_verifier = <random-43-char-string>
   code_challenge = SHA256(code_verifier) → base64url-encoded

2. Redirect user to:
   GET ${origin}/oauth/authorize
     ?client_id=<your-client-id>
     &response_type=code
     &redirect_uri=<your-callback-url>
     &code_challenge=<code_challenge>
     &code_challenge_method=S256
     &scope=upload manage read
     &state=<random-state>

   Example:
   GET ${origin}/oauth/authorize
     ?client_id=my-agent
     &response_type=code
     &redirect_uri=https://your-agent.example.com/callback
     &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
     &code_challenge_method=S256
     &scope=upload%20manage%20read
     &state=abc123

3. User authorizes in browser

4. Exchange code for token (code expires after 10 minutes):
   POST ${origin}/oauth/token
   Content-Type: application/json
   {
     "grant_type": "authorization_code",
     "code": "<authorization_code>",
     "redirect_uri": "<the same redirect_uri as above>",
     "client_id": "<the same client_id as above>",
     "code_verifier": "<code_verifier>"
   }
\`\`\`

**Note**: \`redirect_uri\` and \`client_id\` must match the authorize request exactly.

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

### 9. Static API Key (no browser flow)

For non-interactive clients — CI jobs, schedulers, registry health checks — skip
OAuth entirely and send a long-lived API key as the bearer token instead.

1. Create an account and sign in on ${origin}
2. Open ${origin}/corsproxy and copy the \`ck_...\` API key (or \`GET ${origin}/api/cors-key\` while signed in)
3. Send it as a normal bearer token:

\`\`\`
POST ${origin}/mcp
Authorization: Bearer ck_xxxxxxxx
Accept: application/json, text/event-stream
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_assets",
    "arguments": {}
  },
  "id": 3
}
\`\`\`

API keys can be rotated or revoked at any time (\`POST\`/\`DELETE ${origin}/api/cors-key\`),
and they are the only credential this server accepts from automated systems, so
keep them out of client-side code.

## Capability Probes

The server advertises \`tools\`, \`prompts\` and \`resources\`. This server exposes
**tools only**, so the other capability lists return empty collections:

\`\`\`
prompts/list                 → {"prompts": []}
resources/list               → {"resources": []}
resources/templates/list     → {"resourceTemplates": []}
\`\`\`

Do not treat an empty list as an error, and do not retry an unknown method: an
unimplemented method returns HTTP 200 with JSON-RPC error \`-32601\`.

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
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
