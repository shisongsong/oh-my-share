import { TOOLS } from './mcp.js';

export function handleMcpServerCard(request) {
  const origin = new URL(request.url).origin;

  const card = {
    serverInfo: {
      name: 'oh-my-share',
      description: 'Publish HTML/code from your agent and get a shareable link.',
      version: '2.3.0',
    },
    endpoint: `${origin}/mcp`,
    authentication: {
      type: 'oauth2',
      oauth2: {
        authorizationEndpoint: `${origin}/oauth/authorize`,
        tokenEndpoint: `${origin}/oauth/token`,
        grantTypes: ['authorization_code', 'password'],
        scopes: ['upload', 'manage', 'read'],
        codeChallengeMethods: ['S256'],
      },
    },
    agentAuth: {
      identityEndpoint: `${origin}/api/auth/register`,
      identityTypesSupported: ['anonymous', 'service_auth'],
    },
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    tools: TOOLS,
    resources: [
      {
        uri: `${origin}/.well-known/agent-card.json`,
        name: 'A2A Agent Card',
        description: 'A2A Agent Card for agent-to-agent discovery',
        mimeType: 'application/json',
      },
      {
        uri: `${origin}/.well-known/oauth-protected-resource`,
        name: 'OAuth Protected Resource Metadata',
        description: 'OAuth 2.0 Protected Resource Metadata',
        mimeType: 'application/json',
      },
      {
        uri: `${origin}/.well-known/oauth-authorization-server`,
        name: 'OAuth Authorization Server Metadata',
        description: 'OAuth 2.0 Authorization Server Metadata',
        mimeType: 'application/json',
      },
    ],
    prompts: [
      {
        name: 'share_html',
        description: 'Share HTML content with optional password protection',
        arguments: [
          {
            name: 'content',
            description: 'HTML content to share',
            required: true,
          },
          {
            name: 'password',
            description: 'Optional password for protection',
            required: false,
          },
        ],
      },
    ],
  };

  return new Response(JSON.stringify(card, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
