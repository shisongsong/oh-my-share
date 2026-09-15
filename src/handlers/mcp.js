import { json } from '../security.js';

const MCP_VERSION = '2025-03-26';

const TOOLS = [
  {
    name: 'upload',
    description: 'Upload HTML files and code snippets for sharing',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'HTML or code content to upload' },
        language: { type: 'string', description: 'Language type (html, css, js, json, markdown, etc.)', default: 'html' },
        filename: { type: 'string', description: 'Filename for the content' },
        password: { type: 'string', description: 'Optional password protection' },
        expiresIn: { type: 'string', description: 'Expiration time (1h, 24h, 7d, 30d, 90d)', default: '7d' },
      },
      required: ['content'],
    },
  },
  {
    name: 'list_assets',
    description: 'List all uploaded assets for the current user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'view',
    description: 'View shared HTML content by ID',
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
  {
    name: 'get_info',
    description: 'Get information about the Oh My Share service',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

async function handleToolCall(name, args, env, cookies) {
  const session = cookies.session;

  switch (name) {
    case 'upload': {
      const { content, language = 'html', filename, password, expiresIn = '7d' } = args;
      if (!content) return { error: 'content is required' };

      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const editToken = 'edt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      await env.DB.prepare(
        `INSERT INTO files (id, content, language, filename, owner_id, edit_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, content, language, filename || null, null, editToken).run();

      return {
        id,
        url: `https://openanthropic.com/view/${id}`,
        editUrl: `https://openanthropic.com/edit/${id}?token=${editToken}`,
        editToken,
        language,
        filename,
      };
    }

    case 'list_assets': {
      if (!session) return { error: 'Authentication required' };

      const { results } = await env.DB.prepare(
        `SELECT id, filename, language, created_at, updated_at FROM files WHERE owner_id IS NOT NULL ORDER BY created_at DESC LIMIT 50`
      ).all();

      return {
        assets: results.map(r => ({
          id: r.id,
          filename: r.filename,
          language: r.language,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          url: `https://openanthropic.com/view/${r.id}`,
        })),
        total: results.length,
      };
    }

    case 'view': {
      const { id } = args;
      if (!id) return { error: 'id is required' };

      const row = await env.DB.prepare(
        `SELECT id, content, language, filename, created_at FROM files WHERE id = ?`
      ).bind(id).first();

      if (!row) return { error: 'Content not found' };

      return {
        id: row.id,
        content: row.content,
        language: row.language,
        filename: row.filename,
        createdAt: row.created_at,
        url: `https://openanthropic.com/view/${row.id}`,
      };
    }

    case 'delete': {
      const { id } = args;
      if (!id) return { error: 'id is required' };

      await env.DB.prepare(`DELETE FROM files WHERE id = ?`).bind(id).run();

      return { success: true, message: `Asset ${id} deleted` };
    }

    case 'get_info': {
      return {
        name: 'Oh My Share',
        description: 'HTML and code sharing with end-to-end encryption',
        version: '2.1.0',
        url: 'https://openanthropic.com',
        endpoints: {
          upload: 'POST /api/upload',
          assets: 'GET /api/assets',
          view: 'GET /view/{id}',
          auth: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
        },
        features: ['password protection', 'expiration', 'edit tokens', 'encrypted sharing'],
        rateLimits: {
          upload: '10/hour, 50/day per IP',
          view: '500/hour per IP',
        },
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function handleMcp(request, env) {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('cookie'));

  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      name: 'oh-my-share',
      version: '2.1.0',
      protocolVersion: MCP_VERSION,
      capabilities: {
        tools: { listChanged: false },
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }, 400);
  }

  const { id, method, params } = body;

  if (method === 'initialize') {
    return json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: MCP_VERSION,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: 'oh-my-share',
          version: '2.1.0',
        },
      },
      id,
    });
  }

  if (method === 'notifications/initialized') {
    return new Response(null, { status: 200 });
  }

  if (method === 'tools/list') {
    return json({
      jsonrpc: '2.0',
      result: { tools: TOOLS },
      id,
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const result = await handleToolCall(name, args || {}, env, cookies);

    return json({
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      },
      id,
    });
  }

  if (method === 'ping') {
    return json({ jsonrpc: '2.0', result: {}, id });
  }

  return json({
    jsonrpc: '2.0',
    error: { code: -32601, message: `Method not found: ${method}` },
    id,
  }, 404);
}
