export function handleLlmsTxt(request) {
  const origin = new URL(request.url).origin;

  const content = `# Oh My Share

> Free, no-signup HTML/code sharing. POST HTML, get a link that renders in any browser. Optional end-to-end encryption, stable editable links, expiry dates, and a public gallery.

Oh My Share publishes single-file HTML pages for humans and agents. Anonymous upload requires no account. Built on Cloudflare Workers.

## For agents: publish HTML in one call

- [auth.md](${origin}/auth.md): Full agent guide — anonymous MCP upload, OAuth discovery, decision policy
- [MCP guide](${origin}/mcp-guide): Human-facing setup guide — tools, parameters and per-client install configs
- [MCP server](${origin}/mcp): Remote MCP endpoint (streamable HTTP). Tool \`upload\` works anonymously; list/delete require OAuth
- [MCP server card](${origin}/.well-known/mcp/server-card.json): MCP capability discovery
- [Agent card](${origin}/.well-known/agent-card.json): A2A-style service metadata
- Official MCP Registry: published as \`io.github.shisongsong/oh-my-share\` (https://registry.modelcontextprotocol.io/v0.1/servers/io.github.shisongsong%2Foh-my-share)
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

## Key endpoints

- Upload (REST): POST ${origin}/api/upload — returns JSON with the share link
- View: GET ${origin}/view/<id> — renders the page
- Gallery: ${origin}/gallery — voluntarily published works, searchable (?q=), sorted by new/hot
- Stats: GET ${origin}/api/stats/<id>?token=<edit_token> — visit counts by day/country
- CORS proxy: GET ${origin}/corsproxy?key=<key>&url=<encoded> — relay any public http(s) URL to the browser with CORS headers (free account + API key required, 100 req/h per key, nothing stored)

## Pages

- [Home](${origin}/): Main app — paste HTML, get a link
- [Product demo](${origin}/demo): Animated walkthrough of the sharing flow
- [CORS proxy](${origin}/corsproxy): Free browser CORS relay — get an API key in the console, docs, limits and interactive playground
- [HTML viewer](${origin}/html-viewer): View raw HTML files in the browser
- [Code sharing](${origin}/code-share): Share code snippets with syntax highlighting
- [CodePen alternative](${origin}/codepen-alternative): Lightweight single-file alternative to CodePen
- [Extension](${origin}/extension.zip): Chrome extension for one-click sharing
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
