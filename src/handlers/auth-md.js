export function handleAuthMd(request) {
  const content = `# auth.md

Oh My Share agent authentication and registration.

## Agent Audience

AI agents and automated tools are welcome to interact with Oh My Share.
This document describes how agents can authenticate and register.

## Registration

Agents register by calling the registration endpoint:

- **Endpoint**: \`POST /api/auth/register\`
- **Content-Type**: \`application/json\`
- **Required fields**: \`email\`, \`password\`

## Authentication

After registration, agents authenticate via:

- **Endpoint**: \`POST /api/auth/login\`
- **Content-Type**: \`application/json\`
- **Required fields**: \`email\`, \`password\`
- **Response**: Set-Cookie with session token

## Supported Methods

- **Password-based**: Email and password authentication
- **Session cookies**: Persistent sessions via HTTP cookies

## Credential Use

Authenticated agents can:

- Upload HTML files and code snippets (\`POST /api/upload\`)
- Manage uploaded assets (\`GET /api/assets\`)
- List shared content (\`GET /api/shares\`)
- Access encrypted content with decryption keys

## Rate Limits

- Upload: 10 per hour, 50 per day per IP
- View: 500 per hour per IP
- Auth: 20 per hour per IP

## Contact

For agent integration support, contact: 1400875096@qq.com
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
