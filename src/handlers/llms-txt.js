export function handleLlmsTxt(request) {
  const origin = new URL(request.url).origin;

  const content = `# Oh My Share

> Free, no-signup HTML/code sharing. POST HTML, get a link that renders in any browser. Optional end-to-end encryption, stable editable links, expiry dates, and a public gallery.

Oh My Share publishes single-file HTML pages for humans and agents. Anonymous upload requires no account. Built on Cloudflare Workers.

## For agents: publish HTML in one call

- [auth.md](${origin}/auth.md): Full agent guide — anonymous MCP upload, OAuth discovery, decision policy
- [MCP guide](${origin}/mcp-guide): Human-facing setup guide — tools, parameters and per-client install configs
- [MCP server](${origin}/mcp): Remote MCP endpoint (streamable HTTP). \`upload\` works anonymously; \`upload_site\`, list/delete require OAuth
- [MCP server card](${origin}/.well-known/mcp/server-card.json): MCP capability discovery
- [Agent card](${origin}/.well-known/agent-card.json): A2A-style service metadata
- Official MCP Registry: published as \`io.github.shisongsong/oh-my-share\` (https://registry.modelcontextprotocol.io/v0.1/servers/io.github.shisongsong%2Foh-my-share/versions/latest)
- [RSS feed](${origin}/feed.xml): Latest works published to the gallery
- [Terms](${origin}/terms) · [Privacy](${origin}/privacy): Service terms and privacy policy

### Anonymous upload (MCP)

\`\`\`
POST ${origin}/mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","method":"tools/call","params":{"name":"upload","arguments":{"content":"<html>...</html>","filename":"page.html"}},"id":1}
\`\`\`

### Anonymous upload (REST)

\`\`\`
curl -F "file=@page.html" ${origin}/api/upload
\`\`\`

## Upload limits and expiry

- File uploads up to 2 MB; pasted code up to 500 KB (UTF-8 bytes); access passwords up to 128 characters
- Uploads: 10 per hour and 50 per day per IP; authenticated MCP uploads are counted per account instead
- Expiry is permanent by default on the web form and REST API (\`expiresIn\` in seconds, 0 = permanent). The MCP \`upload\` tool defaults to 7d and accepts \`1h\`, \`24h\`, \`7d\`, \`30d\`, \`90d\`, \`permanent\`
- End-to-end encryption is a paid feature (new accounts get a 3-day trial). Encrypted and password-protected uploads cannot be published to the gallery

## Key endpoints

- Upload (REST): POST ${origin}/api/upload — returns JSON with the share link
- View: GET ${origin}/view/<id> — renders the page
- Community feed: ${origin}/gallery — published works with author profiles and likes, searchable (?q=), sorted by new/hot
- Discussions: ${origin}/community — community discussion board; posts listed with authors and comment counts, sorted by new/hot
- Profiles: ${origin}/u/<userId> — a creator's bio, posts and published works; like via POST /api/likes {file_id}
- Posts: ${origin}/post/<postId> — a discussion post with comments; create via POST /api/posts {title, content}, delete via DELETE /api/posts/<postId>
- Comments: POST /api/comments {target_type: "post"|"work", target_id, content, parent_id?} — comment on a post or published work; delete via DELETE /api/comments/<id>
- Stats: GET https://openanthropic.com/api/stats/<id>?token=<edit_token> — per-link visit totals, daily counts and visitor countries. Token-protected (or call it while signed in as the owner); without a credential it returns 401
- CORS proxy: GET ${origin}/corsproxy?key=<key>&url=<encoded> — relay any public http(s) URL to the browser with CORS headers (free account + API key required, 100 req/h per key, nothing stored)

## Pages

- [Home](${origin}/): Main app — paste HTML, get a link
- [Guides](${origin}/guides): How-to articles — sharing HTML files online, publishing AI-generated pages, sharing reports and portfolios
- [Product demo](${origin}/demo): Animated walkthrough of the sharing flow
- [CORS proxy](${origin}/corsproxy): Free browser CORS relay — get an API key in the console, docs, limits and interactive playground
- [HTML viewer](${origin}/html-viewer): View raw HTML files in the browser
- [Code sharing](${origin}/code-share): Share code snippets with syntax highlighting
- [CodePen alternative](${origin}/codepen-alternative): Lightweight single-file alternative to CodePen
- [MCP guide](${origin}/mcp-guide): Setup guide for Claude, Cursor and other MCP clients
- [Community](${origin}/community): Discussion board — questions, tips and the story behind published works
- [Gallery](${origin}/gallery): Public showcase of HTML works, searchable and sortable by new/popular
- [Contact](${origin}/contact): Owner email (1400875096@qq.com) and WeChat QR code
- [Extension](${origin}/extension.zip): Chrome extension for one-click sharing
- [Full text version](${origin}/llms-full.txt): This index as plain prose, for agents that skip link lists
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// llms-full.txt — the prose companion to llms.txt. llms.txt is a link index;
// this file is what an agent should actually read when it wants to understand
// the service without following links.
export function handleLlmsFullTxt(request) {
  const origin = new URL(request.url).origin;

  const content = `# Oh My Share — full text

Oh My Share (${origin}) is a free, no-signup service for sharing single-file HTML pages and code snippets. You POST HTML, you get back a URL that renders in any browser. It runs on Cloudflare Workers with R2 object storage and a D1 database. Content can optionally be encrypted in the browser before upload, in which case the server never sees the key — that option is a paid feature and new accounts get a 3-day trial.

## What it does

Upload an HTML file or paste a code snippet and get a permanent share link. The link renders the page directly, so there is no wrapping UI and no account required. Optional features include end-to-end encryption, access passwords, expiry dates, editable links, a public gallery of community-published works, and a community discussion board.

## Publishing HTML in one call

Agents can publish without any credentials. Over MCP:

\`\`\`
POST ${origin}/mcp
Accept: application/json, text/event-stream
Content-Type: application/json

{"jsonrpc":"2.0","method":"tools/call","params":{"name":"upload","arguments":{"content":"<html>...</html>","filename":"page.html"}},"id":1}
\`\`\`

Or over REST with multipart form data:

\`\`\`
curl -F "file=@page.html" ${origin}/api/upload
\`\`\`

Both return JSON containing the new share link.

## Reading shared content

GET ${origin}/view/<id> renders the shared page. Shared pages are ordinary web pages and are meant to be indexed.

There is no public raw-source endpoint for ordinary uploads. Agents read content back with the MCP \`view\` tool (anonymous, takes an id). The path \`/api/content/<id>\` exists only to serve the ciphertext of encrypted uploads.

## The MCP server

${origin}/mcp is a Streamable HTTP MCP endpoint exposing seven tools:

- \`upload\` (anonymous) — publish one HTML/code payload and receive a share link; supports \`idempotencyKey\`
- \`upload_site\` (authentication required) — publish a multi-file static site (root \`index.html\`, 200 files / 20 MB) at \`/s/<id>/\`
- \`view\` (anonymous) — read shared content by id
- \`get_info\` (anonymous) — server version and limits
- \`search_gallery\` (anonymous) — search the public gallery
- \`list_assets\` (authentication required) — list your own uploads
- \`delete\` (authentication required) — delete one of your uploads

Authentication is OAuth 2.1 with PKCE, discovered through ${origin}/.well-known/oauth-protected-resource. Interactive clients should complete the browser authorization code flow. Non-interactive clients — CI jobs, schedulers, health checks — can skip the browser flow and send a long-lived API key as \`Authorization: Bearer ck_...\` instead; keys are issued from ${origin}/corsproxy. The complete agent guide, including both flows, is at ${origin}/auth.md.

## Limits

- File uploads up to 2 MB, pasted code up to 500 KB, passwords up to 128 characters
- Uploads: 10 per hour and 50 per day per IP; authenticated MCP uploads are counted per account instead; a global daily cap also applies
- Static sites: 200 files, 20 MB total, 5 MB per file; authentication required
- Views are rate limited to 500 per hour per IP

## Guides

${origin}/guides collects step-by-step articles (bilingual, zh and en): sharing an HTML file online, publishing AI-generated HTML, sharing Claude artifacts, and sending reports or portfolios as links. Each one documents the real parameters, so they are safe to follow verbatim.

## Community features

Published works appear in a public gallery at ${origin}/gallery, searchable by keyword and sortable by newest or most popular. Creators have profile pages at ${origin}/u/<userId>. A discussion board lives at ${origin}/community where posts can be attached to a work, and both posts and published works accept threaded comments. Likes are recorded through POST ${origin}/api/likes.

## CORS proxy

${origin}/corsproxy relays any public http(s) URL to the browser with permissive CORS headers, which turns a client-side fetch into a plain link. It requires a free account and an API key, allows 100 requests per hour per key, and stores nothing.

## Contact

Questions, feedback or business enquiries: 1400875096@qq.com. A WeChat QR code is available at ${origin}/contact. Abuse reports can be filed at ${origin}/abuse.
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
