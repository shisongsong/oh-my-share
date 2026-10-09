# Oh My Share

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry%20v2.2.0-8A2BE2)](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.shisongsong%2Foh-my-share/versions)
[![Live](https://img.shields.io/badge/live-openanthropic.com-brightgreen)](https://openanthropic.com)

Free, no-signup HTML & code sharing — for humans **and** AI agents.

Paste code (or drag in a `.html` file) at **[openanthropic.com](https://openanthropic.com)**, get back a link like `https://openanthropic.com/view/<id>` that renders in any browser. AI agents get the same ability over **MCP**, a **JSON API**, and an **A2A** endpoint: send HTML in, shareable link out.

中文简介：免费无注册的 HTML/代码分享工具，支持端到端加密、可编辑的永久链接、密码保护、过期时间与公开作品广场；同时内置 MCP 服务器与 A2A 端点，AI 代理可以直接发布内容。

---

## Features

- **No account required** — paste and share, works on mobile
- **Editable permanent links** — every share has an `editToken`; update the content at the same URL while you iterate
- **Optional end-to-end encryption** — encrypted in the browser, the server only ever stores ciphertext (registered accounts include a 3-day encryption trial)
- **Password protection** and **expiry** (1 hour – 90 days)
- **Public gallery** — publish works to `/gallery`, searchable by keyword, sortable by newest/popular
- **Abuse reporting** — reported content is unpublished immediately (HTTP 451) pending review, with an appeal path
- **Referrer-Policy + sandboxed rendering** — shared pages are served with `no-referrer` and a sandbox CSP so they can't touch your session

## For humans

1. Open **https://openanthropic.com**
2. Paste code or drag a `.html` file in
3. Copy the `/view/<id>` link

Advanced options (password, expiry, title, tags, publish-to-gallery) are in the same editor. Use the returned `editToken` to update the share later at `POST /api/edit/<id>`.

## For AI agents

Three equivalent interfaces — no API key needed for the basic flows.

### 1. MCP server (streamable HTTP)

Endpoint: **`https://openanthropic.com/mcp`**
Listed in the official MCP Registry as [`io.github.shisongsong/oh-my-share`](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.shisongsong%2Foh-my-share/versions) (v2.2.0). No API key required — anonymous clients can call every tool (OAuth metadata is also advertised for clients that prefer it); requests are rate-limited per IP.

**Claude Code:**

```bash
claude mcp add --transport http oh-my-share https://openanthropic.com/mcp
```

**Any MCP client that reads `mcp.json` (Cursor, VS Code, …):**

```json
{
  "mcpServers": {
    "oh-my-share": { "url": "https://openanthropic.com/mcp" }
  }
}
```

**Tools:**

| Tool | Arguments | Description |
|------|-----------|-------------|
| `upload` | `content` (string), `language?`, `filename?`, `password?`, `expiresIn?` (`1h`/`24h`/`7d`/`30d`/`90d`, default `7d`) | Upload HTML or a code snippet; returns the share URL, id and edit token |
| `list_assets` | – | List assets uploaded in the current session |
| `view` | `id` | Fetch shared content by id |
| `delete` | `id` | Delete an asset you own |
| `get_info` | – | Service info (name, version, endpoints) |
| `search_gallery` | `query`, `sort?` (`new`\|`hot`), `page?`, `limit?` (≤20) | Full-text search of the public gallery (title, description, tags, id) |

### 2. JSON API (CORS-open)

```bash
# publish HTML, get a share link back
curl -s https://openanthropic.com/api/upload \
  -H 'Content-Type: application/json' \
  -d '{"code":"<h1>Hello from an agent</h1>"}'
# → {"url":"https://openanthropic.com/view/<id>","id":"<id>","editToken":"...","expiresAt":null}

# search the gallery
curl -s 'https://openanthropic.com/api/gallery?q=dashboard&sort=hot&page=1&limit=10'
# → {"items":[…],"total":…,"page":1,"pages":…}
```

### 3. A2A endpoint (Agent2Agent, v1.0 JSON-RPC)

- Endpoint: **`POST https://openanthropic.com/a2a`**
- Agent card: **`https://openanthropic.com/.well-known/agent-card.json`**
- Registered at a2aregistry.org as `com.openanthropic.oh_my_share`
- Stateless: completed tasks are synthesized from stored shares, so `GetTask` works for any share id

```bash
curl -s https://openanthropic.com/a2a \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"SendMessage",
    "params":{"message":{"messageId":"m1","parts":[{"text":"<h1>Hi</h1>"}]}}
  }'
# → completed task whose artifacts carry the /view/<id> URL
```

`GetTask`, `/search <query>` and a plain-text help reply (for anything that isn't HTML) are supported too; streaming/cancel methods return standard A2A "not supported" errors.

## Self-hosting

Requirements: Node.js 18+, a Cloudflare account (Workers, D1, R2), [`wrangler`](https://developers.cloudflare.com/wrangler/) (installed via `npm install`).

```bash
git clone https://github.com/shisongsong/oh-my-share.git
cd oh-my-share
npm install

# create the storage (once)
npx wrangler d1 create oh-my-share-db        # put the returned database_id into wrangler.jsonc
npx wrangler r2 bucket create oh-my-share-bucket

# apply schema migrations
npx wrangler d1 migrations apply oh-my-share-db --remote

# local development (uses the same bindings)
npm run dev

# tests (19 unit/integration tests, Cloudflare Workers pool)
npm test

# build + deploy
npm run deploy
```

Notes for your own deployment:

- Remove or edit the `routes` entry in `wrangler.jsonc` (it points at the production custom domain)
- The daily cron (`triggers.crons`) runs the stats snapshot/IndexNow job — optional
- `monitor/` holds an optional shell-based analytics/uptime monitor (`monitor/README.md`); copy `monitor/.env.example` to fill in your Cloudflare API token

## Architecture

- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** — one worker: routing, SSR pages, MCP server, JSON API, A2A endpoint
- **D1** (SQLite) — metadata: shares, sessions, subscriptions, gallery index, reports
- **R2** — content objects (HTML/code/encrypted blobs)
- **Web Crypto** — password hashing and client-side end-to-end encryption (keys never leave the browser except in the URL fragment)

Agent-facing files: [`llms.txt`](https://openanthropic.com/llms.txt) · [`robots.txt`](https://openanthropic.com/robots.txt) · [sitemap](https://openanthropic.com/sitemap.xml) · [MCP server card](https://openanthropic.com/.well-known/mcp/server-card.json) · [A2A agent card](https://openanthropic.com/.well-known/agent-card.json)

## Contributing

Issues and PRs are welcome. Run `npm test` before submitting — CI parity matters more than style nits.

## License

[MIT](LICENSE) © shisongsong
