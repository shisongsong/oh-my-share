export function handleMcpServerCard(request) {
  const origin = new URL(request.url).origin;

  const card = {
    serverInfo: {
      name: 'oh-my-share',
      version: '2.1.0',
    },
    description: 'HTML and code sharing with end-to-end encryption. Upload, manage, and share HTML files and code snippets.',
    endpoint: `${origin}/mcp`,
    capabilities: {
      tools: {
        listChanged: false,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
    },
    tools: [
      {
        name: 'upload',
        description: 'Upload HTML files and code snippets for sharing',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'HTML or code content' },
            language: { type: 'string', description: 'Language type (html, css, js, etc.)' },
            filename: { type: 'string', description: 'Filename for the content' },
            password: { type: 'string', description: 'Optional password protection' },
            expiresIn: { type: 'string', description: 'Expiration time (1h, 24h, 7d, 30d, 90d)' },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_assets',
        description: 'List uploaded assets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'view',
        description: 'View shared HTML content',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Asset ID to view' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete',
        description: 'Delete an uploaded asset',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Asset ID to delete' },
          },
          required: ['id'],
        },
      },
    ],
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

  return new Response(JSON.stringify(card), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
