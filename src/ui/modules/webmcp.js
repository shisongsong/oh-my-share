export function initWebMcp() {
  if (!navigator.modelContext) return;

  const controller = new AbortController();
  const { signal } = controller;

  navigator.modelContext.registerTool({
    name: 'upload_content',
    description: 'Upload HTML files and code snippets for sharing',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'HTML or code content to upload' },
        language: { type: 'string', description: 'Language type (html, css, js, json, etc.)' },
        filename: { type: 'string', description: 'Filename for the content' },
        password: { type: 'string', description: 'Optional password protection' },
        expiresIn: { type: 'string', description: 'Expiration time (1h, 24h, 7d, 30d, 90d)' },
      },
      required: ['content'],
    },
    execute: async (args) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      return await response.json();
    },
    signal,
  });

  navigator.modelContext.registerTool({
    name: 'list_assets',
    description: 'List all uploaded assets for the current user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      const response = await fetch('/api/assets');
      return await response.json();
    },
    signal,
  });

  navigator.modelContext.registerTool({
    name: 'view_content',
    description: 'View shared HTML content by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Asset ID to view' },
      },
      required: ['id'],
    },
    execute: async (args) => {
      const response = await fetch(`/api/content/${args.id}`);
      return await response.json();
    },
    signal,
  });

  navigator.modelContext.registerTool({
    name: 'delete_asset',
    description: 'Delete an uploaded asset',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Asset ID to delete' },
      },
      required: ['id'],
    },
    execute: async (args) => {
      const response = await fetch(`/api/assets/${args.id}`, {
        method: 'DELETE',
      });
      return await response.json();
    },
    signal,
  });

  navigator.modelContext.registerTool({
    name: 'get_service_info',
    description: 'Get information about the Oh My Share service',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      return {
        name: 'Oh My Share',
        description: 'HTML and code sharing with end-to-end encryption',
        endpoints: {
          upload: '/api/upload',
          assets: '/api/assets',
          view: '/view/{id}',
          auth: '/api/auth/login',
        },
        features: ['password protection', 'expiration', 'edit tokens', 'encrypted sharing'],
      };
    },
    signal,
  });

  return () => controller.abort();
}
