import { json } from '../security.js';
import { validateToken } from './oauth-token.js';

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

async function getAuthContext(request, env) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const userId = await validateToken(request, env);
    if (userId) return { userId, source: 'token' };
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies.session) {
    const user = await env.DB.prepare(
      `SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > strftime('%s','now')`
    ).bind(cookies.session).first();
    if (user) return { userId: user.user_id, source: 'cookie' };
  }

  return null;
}

async function handleToolCall(name, args, env, auth) {
  switch (name) {
    case 'upload': {
      const { content, language = 'html', filename, password, expiresIn = '7d' } = args;
      if (!content) return { error: 'content is required' };

      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const editToken = 'edt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const ownerId = auth ? auth.userId : null;
      const createdAt = Math.floor(Date.now() / 1000);

      // Store content in R2
      await env.MY_BUCKET.put(id, content, {
        httpMetadata: { contentType: 'text/html' },
      });

      // Store metadata in database
      await env.DB.prepare(
        `INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, filename || null, ownerId, createdAt, editToken, createdAt).run();

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
      if (!auth) return { error: 'Authentication required. Use Bearer token or login first.' };

      const { results } = await env.DB.prepare(
        `SELECT id, filename, created_at, updated_at FROM files WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50`
      ).bind(auth.userId).all();

      return {
        assets: results.map(r => ({
          id: r.id,
          filename: r.filename,
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
        `SELECT id, filename, created_at FROM files WHERE id = ?`
      ).bind(id).first();

      if (!row) return { error: 'Content not found' };

      // Read content from R2
      const object = await env.MY_BUCKET.get(id);
      const content = object ? await object.text() : null;

      return {
        id: row.id,
        content,
        filename: row.filename,
        createdAt: row.created_at,
        url: `https://openanthropic.com/view/${row.id}`,
      };
    }

    case 'delete': {
      if (!auth) return { error: 'Authentication required' };

      const { id } = args;
      if (!id) return { error: 'id is required' };

      const result = await env.DB.prepare(
        `DELETE FROM files WHERE id = ? AND owner_id = ?`
      ).bind(id, auth.userId).run();

      if (result.changes === 0) return { error: 'Asset not found or not authorized' };

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
          mcp: 'POST /mcp',
          oauth: 'POST /oauth/token',
        },
        features: ['password protection', 'expiration', 'edit tokens', 'encrypted sharing', 'MCP'],
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
  const origin = new URL(request.url).origin;

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

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await getAuthContext(request, env);

  let body;
  try {
    const contentType = request.headers.get('content-type') || '';
    const text = await request.text();

    if (contentType.includes('application/json')) {
      body = JSON.parse(text);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(text));
      if (typeof body.params === 'string') {
        try { body.params = JSON.parse(body.params); } catch {}
      }
      if (typeof body.id === 'string' && /^\d+$/.test(body.id)) {
        body.id = parseInt(body.id);
      }
    } else {
      body = JSON.parse(text);
    }
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
    const result = await handleToolCall(name, args || {}, env, auth);

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
