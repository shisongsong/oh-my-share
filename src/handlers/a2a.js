// A2A (Agent2Agent) protocol v1.0 JSON-RPC binding.
// Endpoint: POST /a2a — registry clients (a2aregistry.org etc.) call
// SendMessage / GetTask here. Stateless by design: completed tasks are
// synthesized from the files table, so no task storage is needed.
import {
  checkRateLimit,
  getClientIp,
  getDatabase,
  getBucket,
} from '../security.js';

const MAX_CONTENT_BYTES = 1024 * 1024;

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: data ? { code, message, data } : { code, message },
  };
}

function taskNotFoundData(taskId) {
  return [
    {
      '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
      reason: 'TASK_NOT_FOUND',
      domain: 'a2a-protocol.org',
      metadata: { taskId: String(taskId || '') },
    },
  ];
}

function agentMessage(text, extra = {}) {
  return {
    messageId: crypto.randomUUID(),
    role: 'ROLE_AGENT',
    parts: [{ text: String(text) }],
    ...extra,
  };
}

function looksLikeHtml(content) {
  const head = String(content).slice(0, 400);
  if (/<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<meta\s+charset/i.test(head)) return true;
  const open = head.match(/<[a-z][^>]*>/gi) || [];
  const close = head.match(/<\/[a-z][^>]*>/gi) || [];
  return open.length >= 2 && close.length >= 1;
}

function extractTitle(content) {
  const m = String(content).match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return m ? m[1].trim() : null;
}

function buildHelp(origin) {
  return [
    'Oh My Share — HTML & code sharing agent (A2A v1.0).',
    '',
    'Commands:',
    '  publish <html...>   Upload HTML/code and get a share link',
    '  search <keyword>    Search the public gallery',
    '  (or just send HTML content directly)',
    '',
    `Web app: ${origin}`,
    `Gallery: ${origin}/gallery`,
    `MCP: ${origin}/mcp`,
  ].join('\n');
}

async function publishContent(env, content) {
  const database = getDatabase(env);
  const bucket = getBucket(env);
  if (!database || !bucket) throw new Error('Service unavailable');

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const editToken = 'edt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = Math.floor(Date.now() / 1000);
  const title = extractTitle(content);

  await bucket.put(id, content, {
    httpMetadata: { contentType: 'text/html' },
  });

  await database
    .prepare(
      `INSERT INTO files (id, filename, owner_id, encrypted, title, created_at, edit_token, updated_at, published_at)
       VALUES (?, ?, NULL, 0, ?, ?, ?, ?, 0)`
    )
    .bind(id, title ? `${title.slice(0, 80)}.html` : 'a2a-share.html', title, now, editToken, now)
    .run();

  return { id, editToken, title, now };
}

async function searchGallery(env, query) {
  const { queryGallery } = await import('./gallery.js');
  const data = await queryGallery(env, { q: query, sort: 'new', page: 1, perPage: 10 });
  if (!data.items.length) return `No gallery results for "${query}".`;
  const lines = data.items.map((item) => {
    const t = item.title || item.filename || item.id;
    return `- ${t} | ${'https://openanthropic.com/view/' + item.id} (${item.views} views)`;
  });
  return `Gallery results for "${query}" (${data.total} total):\n${lines.join('\n')}`;
}

async function handleSendMessage(params, env, origin, nowIso) {
  const message = params && typeof params.message === 'object' ? params.message : null;
  if (!message || !Array.isArray(message.parts) || message.parts.length === 0) {
    return rpcError(null, -32602, 'Invalid parameters', [
      {
        '@type': 'type.googleapis.com/google.rpc.BadRequest',
        fieldViolations: [{ field: 'message.parts', description: 'At least one part is required' }],
      },
    ]);
  }

  const textParts = message.parts
    .filter((p) => p && typeof p.text === 'string')
    .map((p) => p.text);
  let content = textParts.join('\n').trim();
  const contextId =
    (typeof message.contextId === 'string' && message.contextId.slice(0, 64)) || null;

  // search command
  const searchMatch = content.match(/^\s*(?:\/)?search\s+([\s\S]{1,100})$/i);
  if (searchMatch) {
    const results = await searchGallery(env, searchMatch[1].trim());
    return rpcResult(null, {
      message: agentMessage(results, contextId ? { contextId } : {}),
    });
  }

  // publish command (explicit prefix or raw HTML/code payload)
  content = content.replace(/^\s*(?:\/)?publish\s*[:\s]\s*/i, '');
  const shouldPublish = /^\s*(?:\/)?publish\b/i.test(textParts[0] || '') || looksLikeHtml(content);

  if (!shouldPublish) {
    return rpcResult(null, {
      message: agentMessage(buildHelp(origin), contextId ? { contextId } : {}),
    });
  }

  if (new TextEncoder().encode(content).byteLength > MAX_CONTENT_BYTES) {
    return rpcError(null, -32602, 'Invalid parameters', [
      {
        '@type': 'type.googleapis.com/google.rpc.BadRequest',
        fieldViolations: [{ field: 'message.parts', description: 'Content exceeds 1MB limit' }],
      },
    ]);
  }

  const stored = await publishContent(env, content);
  const shareUrl = `${origin}/view/${stored.id}`;
  const editUrl = `${origin}/edit/${stored.id}?token=${stored.editToken}`;

  const reply =
    `Published: ${shareUrl}\n` +
    `Edit link (keep private): ${editUrl}\n` +
    `Gallery detail: ${origin}/gallery/${stored.id} (publish from your account to list it)`;

  const task = {
    id: stored.id,
    ...(contextId ? { contextId } : {}),
    status: {
      state: 'TASK_STATE_COMPLETED',
      message: agentMessage(reply, contextId ? { contextId } : {}),
      timestamp: nowIso,
    },
    artifacts: [
      {
        name: 'share',
        parts: [
          { text: shareUrl, mediaType: 'text/plain' },
          { text: editUrl, mediaType: 'text/plain' },
        ],
      },
    ],
    history: [
      {
        messageId: message.messageId || crypto.randomUUID(),
        role: 'ROLE_USER',
        parts: message.parts.slice(0, 4),
        ...(contextId ? { contextId } : {}),
      },
    ],
  };

  return rpcResult(null, { task });
}

async function handleGetTask(params, env) {
  const taskId = params && typeof params.id === 'string' ? params.id : null;
  if (!taskId) {
    return rpcError(null, -32602, 'Invalid parameters', [
      {
        '@type': 'type.googleapis.com/google.rpc.BadRequest',
        fieldViolations: [{ field: 'id', description: 'Task id is required' }],
      },
    ]);
  }

  const database = getDatabase(env);
  if (!database) throw new Error('Service unavailable');
  const row = await database
    .prepare('SELECT id, title, created_at FROM files WHERE id = ?')
    .bind(taskId)
    .first();
  if (!row) return rpcError(null, -32001, 'Task not found', taskNotFoundData(taskId));

  const origin = 'https://openanthropic.com';
  const shareUrl = `${origin}/view/${row.id}`;
  return rpcResult(null, {
    id: row.id,
    status: {
      state: 'TASK_STATE_COMPLETED',
      timestamp: new Date(row.created_at * 1000).toISOString(),
      message: agentMessage(`Share is live: ${shareUrl}`),
    },
    artifacts: [
      { name: 'share', parts: [{ text: shareUrl, mediaType: 'text/plain' }] },
    ],
  });
}

export async function handleA2a(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const ip = getClientIp(request);
  const limit = await checkRateLimit(env, ip, 'a2a-h', 30, 3600);
  if (!limit.allowed) {
    return json({ error: 'Too many requests' }, 429, { 'Retry-After': String(limit.retryAfter) });
  }

  const origin = new URL(request.url).origin;
  const nowIso = new Date().toISOString();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, 'Invalid JSON payload')), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (Array.isArray(payload) || typeof payload !== 'object' || payload === null) {
    return new Response(JSON.stringify(rpcError(null, -32600, 'Request payload validation error')), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const { id: reqId, method, params } = payload;
  if (payload.jsonrpc !== '2.0' || typeof method !== 'string') {
    return new Response(JSON.stringify(rpcError(reqId ?? null, -32600, 'Request payload validation error')), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let envelope;
  try {
    switch (method) {
      case 'SendMessage':
        envelope = await handleSendMessage(params || {}, env, origin, nowIso);
        break;
      case 'GetTask':
        envelope = await handleGetTask(params || {}, env);
        break;
      case 'SendStreamingMessage':
        envelope = rpcError(reqId ?? null, -32004, 'Unsupported operation: streaming is not supported', [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'STREAMING_NOT_SUPPORTED',
            domain: 'a2a-protocol.org',
          },
        ]);
        break;
      case 'CancelTask': {
        const id = params && params.id;
        const database = getDatabase(env);
        const row = id && database
          ? await database.prepare('SELECT id FROM files WHERE id = ?').bind(id).first()
          : null;
        envelope = row
          ? rpcError(reqId ?? null, -32002, 'Task not cancelable: already completed', [
              {
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                reason: 'TASK_NOT_CANCELABLE',
                domain: 'a2a-protocol.org',
                metadata: { taskId: String(id) },
              },
            ])
          : rpcError(reqId ?? null, -32001, 'Task not found', taskNotFoundData(id));
        break;
      }
      default:
        envelope = rpcError(reqId ?? null, -32601, 'Method not found');
    }
  } catch (error) {
    console.error('A2A handler error:', error);
    envelope = rpcError(reqId ?? null, -32603, 'Internal error');
  }

  // preserve the request id on result envelopes
  if (envelope && envelope.result) envelope.id = reqId ?? null;

  return new Response(JSON.stringify(envelope), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
