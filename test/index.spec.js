import {
	applyD1Migrations,
	createExecutionContext,
	env,
	SELF,
	waitOnExecutionContext,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src";
import { handleUpload } from "../src/handlers/upload.js";
import { detectLang } from "../src/i18n.js";
import { validateSlug } from "../src/security.js";

const migrationFiles = import.meta.glob("../migrations/*.sql", {
	query: "?raw",
	import: "default",
	eager: true,
});

beforeAll(async () => {
	const names = Object.keys(migrationFiles).sort((a, b) => {
		const num = (name) => parseInt(name.split("/").pop().split("_")[0], 10);
		return num(a) - num(b);
	});
	await applyD1Migrations(
		env.DB,
		names.map((name) => ({
			name: name.split("/").pop(),
			queries: migrationFiles[name]
				.split(";")
				.map((query) => query.trim())
				.filter(Boolean),
		}))
	);
});

async function fetchWorker(request) {
	const context = createExecutionContext();
	const response = await worker.fetch(request, env, context);
	await waitOnExecutionContext(context);
	return response;
}

function createUploadEnv() {
	const rateCounts = new Map();
	const files = new Map();
	const objects = new Map();
	const database = {
		prepare(query) {
			return {
				bind(...values) {
					return {
						async first() {
							if (query.includes("rate_limits")) {
								const key = values[0];
								const count = (rateCounts.get(key) || 0) + 1;
								rateCounts.set(key, count);
								return { count };
							}
							if (query.startsWith("SELECT")) {
								return files.has(values[0]) ? { id: values[0] } : null;
							}
							return null;
						},
						async run() {
							files.set(values[0], { filename: values[1] });
							return { success: true };
						},
					};
				},
			};
		},
	};
	const bucket = {
		async put(key, value) {
			objects.set(key, value);
		},
	};

	return { DB: database, MY_BUCKET: bucket, files, objects };
}

describe("Oh My Share worker", () => {
	it("renders the English home page with security headers", async () => {
		const response = await fetchWorker(new Request("http://example.com/"));

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
		expect(await response.text()).toContain("Oh My Share");
	});

	it("detects Chinese requests for the home page", async () => {
		const response = await fetchWorker(new Request("http://example.com/", {
			headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
		}));

		const html = await response.text();
		expect(html).toContain("<html lang=\"zh-CN\">");
		expect(html).toContain("极简 HTML 文件与代码分享工具");
		expect(html).not.toContain("localStorage.getItem('osh_lang')");
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it("uses the Cloudflare country header when request.cf is unavailable", () => {
		const request = new Request("http://example.com/", {
			headers: {
				"Accept-Language": "en-US,en;q=0.9",
				"CF-IPCountry": "CN",
			},
		});

		expect(detectLang(request)).toBe("zh");
	});

	it("returns a 404 page for unknown routes", async () => {
		const response = await SELF.fetch("http://example.com/unknown");

		expect(response.status).toBe(404);
		const html = await response.text();
		expect(html).toContain("<title>404 - Page Not Found | Oh My Share</title>");
		expect(html).toContain('content="noindex"');
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("rejects invalid view IDs before reading storage", async () => {
		const response = await fetchWorker(new Request("http://example.com/view/not%20valid"));

		expect(response.status).toBe(400);
		expect(await response.text()).toBe("Invalid ID");
	});

	it("normalizes valid slugs and rejects reserved values", () => {
		expect(validateSlug(" My-Report ")).toBe("my-report");
		expect(validateSlug("view")).toBeNull();
		expect(validateSlug("bad_slug")).toBeNull();
	});

	it("uploads pasted code without overwriting an existing slug", async () => {
		const uploadEnv = createUploadEnv();
		const formData = new FormData();
		formData.set("code", "<!doctype html><h1>Share</h1>");
		formData.set("slug", "demo-page");

		const response = await handleUpload(
			new Request("https://example.com/api/upload", {
				method: "POST",
				body: formData,
				headers: { "CF-Connecting-IP": "203.0.113.10" },
			}),
			uploadEnv
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({
			url: "https://example.com/view/demo-page",
			id: "demo-page",
			editToken: expect.stringMatching(/^edt_/),
			expiresAt: null,
		});
		expect(uploadEnv.files.get("demo-page")).toEqual({ filename: "pasted-code.html" });
		expect(uploadEnv.objects.get("demo-page")).toBe("<!doctype html><h1>Share</h1>");

		const duplicateResponse = await handleUpload(
			new Request("https://example.com/api/upload", {
				method: "POST",
				body: formData,
				headers: { "CF-Connecting-IP": "203.0.113.10" },
			}),
			uploadEnv
		);

		expect(duplicateResponse.status).toBe(409);
	});

	it("deletes an asset that has visit records (FK cascade)", async () => {
		const email = `del-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];
		expect(cookie).toContain("osh_session=");

		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: JSON.stringify({ code: "<h1>delete me</h1>" }),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		const view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(view.status).toBe(200);

		const remove = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}`, {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(remove.status).toBe(200);
		expect(await remove.json()).toEqual({ ok: true });

		const gone = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(gone.status).toBe(404);
	});

	it("publishes assets to the gallery with search, guards and unpublish", async () => {
		const email = `gal-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];

		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: JSON.stringify({
					code: "<h1>gallery work</h1>",
					title: "时钟动画 clock",
					tags: "clock,demo",
				}),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		// Not visible in the gallery before publishing
		let page = await fetchWorker(new Request("http://example.com/gallery"));
		expect(page.status).toBe(200);
		expect(await page.text()).not.toContain(id);

		// Password protected assets cannot be published
		const locked = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: JSON.stringify({ code: "<h1>locked</h1>", password: "secret123" }),
			})
		);
		expect(locked.status).toBe(200);
		const lockedId = (await locked.json()).id;
		const lockedPublish = await fetchWorker(
			new Request(`http://example.com/api/assets/${lockedId}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: true }),
			})
		);
		expect(lockedPublish.status).toBe(400);
		expect((await lockedPublish.json()).code).toBe("errCannotPublish");

		// Owner publishes
		const publish = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: true }),
			})
		);
		expect(publish.status).toBe(200);
		expect(await publish.json()).toMatchObject({ ok: true, published: true });

		// Visible in the gallery and searchable
		page = await fetchWorker(new Request("http://example.com/gallery"));
		let html = await page.text();
		expect(html).toContain(id);
		expect(html).toContain("clock");

		const search = await fetchWorker(new Request("http://example.com/gallery?q=clock"));
		expect(search.status).toBe(200);
		expect(search.headers.get("x-robots-tag")).toContain("noindex");
		expect(await search.text()).toContain(id);

		const miss = await fetchWorker(new Request("http://example.com/gallery?q=zzznomatch9"));
		expect(await miss.text()).not.toContain(id);

		// Another user cannot modify publishing state
		const registerB = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email: `galb-${Date.now()}@test.com`, password: "Passw0rd123" }),
			})
		);
		expect(registerB.status).toBe(201);
		const cookieB = (registerB.headers.get("set-cookie") || "").split(";")[0];
		const foreign = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookieB },
				body: JSON.stringify({ published: false }),
			})
		);
		expect(foreign.status).toBe(404);
		expect((await foreign.json()).code).toBe("errNotFound");

		// Owner unpublishes → gone from the gallery
		const unpublish = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: false }),
			})
		);
		expect(unpublish.status).toBe(200);
		page = await fetchWorker(new Request("http://example.com/gallery"));
		expect(await page.text()).not.toContain(id);

		// Sitemap includes the gallery
		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("/gallery");
	});

	it("edits shared content in place and revalidates views with ETag", async () => {
		const email = `edit-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);

		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ code: "<h1>version one</h1>", title: "iter" }),
			})
		);
		expect(upload.status).toBe(200);
		const { id, editToken } = await upload.json();

		let view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(await view.text()).toContain("version one");

		// Save new content under the same link
		const save = await fetchWorker(
			new Request(`http://example.com/api/edit/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({
					editToken,
					title: "iter v2",
					description: "updated",
					tags: "v2",
					code: "<h1>version two</h1>",
				}),
			})
		);
		expect(save.status).toBe(200);
		expect(await save.json()).toMatchObject({ success: true, contentSaved: true });

		view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		const html = await view.text();
		expect(html).toContain("version two");
		expect(html).not.toContain("version one");
		expect(view.headers.get("cache-control")).toBe("no-cache");

		// ETag revalidation returns 304
		const etag = view.headers.get("etag");
		expect(etag).toBeTruthy();
		const revalidated = await fetchWorker(
			new Request(`http://example.com/view/${id}`, { headers: { "If-None-Match": etag } })
		);
		expect(revalidated.status).toBe(304);

		// Empty content rejected
		const empty = await fetchWorker(
			new Request(`http://example.com/api/edit/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ editToken, code: "" }),
			})
		);
		expect(empty.status).toBe(400);
		expect((await empty.json()).code).toBe("errEmptyContent");

		// Wrong token rejected
		const wrong = await fetchWorker(
			new Request(`http://example.com/api/edit/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ editToken: "edt_bogus", code: "<h1>hacked</h1>" }),
			})
		);
		expect(wrong.status).toBe(403);

		// Metadata-only save still works without a code field (back-compat)
		const metaOnly = await fetchWorker(
			new Request(`http://example.com/api/edit/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ editToken, title: "meta only" }),
			})
		);
		expect(metaOnly.status).toBe(200);
		expect((await metaOnly.json()).contentSaved).toBeFalsy();
	});

	it("serves gallery detail pages, remix prefill and JSON API for published works", async () => {
		const email = `detail-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];

		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: JSON.stringify({
					code: "<!doctype html><title>Detail Work</title><h1>detail body</h1>",
					title: "detail work",
					tags: "detail,test",
				}),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		// Detail page 404 before publishing
		expect((await fetchWorker(new Request(`http://example.com/gallery/${id}`))).status).toBe(404);

		const publish = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: true }),
			})
		);
		expect(publish.status).toBe(200);

		// Detail page: indexable, canonical, iframe preview, action buttons
		const detail = await fetchWorker(new Request(`http://example.com/gallery/${id}`));
		expect(detail.status).toBe(200);
		const detailHtml = await detail.text();
		expect(detailHtml).toContain(`<link rel="canonical" href="http://example.com/gallery/${id}">`);
		expect(detailHtml).toContain(`src="/view/${id}"`);
		expect(detailHtml).toContain(`/remix/${id}`);
		expect(detailHtml).toContain(`/abuse?id=${id}`);
		expect(detailHtml).toContain("detail work");

		// Remix page prefills the editor with hidden provenance field
		const remix = await fetchWorker(new Request(`http://example.com/remix/${id}`));
		expect(remix.status).toBe(200);
		const remixHtml = await remix.text();
		expect(remixHtml).toContain(`id="remixedFrom" value="${id}"`);
		expect(remixHtml).toContain("detail body");
		expect(remixHtml).toContain('content="noindex, nofollow"');

		// JSON API for agents
		const api = await fetchWorker(new Request(`http://example.com/api/gallery?q=detail`));
		expect(api.status).toBe(200);
		expect(api.headers.get("content-type")).toContain("application/json");
		const data = await api.json();
		const found = (data.items || []).find((item) => item.id === id);
		expect(found).toBeTruthy();
		expect(found.detail_url).toContain(`/gallery/${id}`);
		expect(found.tags).toContain("detail");

		// Cards link to the detail page now
		const list = await fetchWorker(new Request("http://example.com/gallery"));
		expect((await list.text())).toContain(`/gallery/${id}`);
	});

	it("reports content: unpublishes, blocks views with 451, and rate limits", async () => {
		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ code: "<h1>phishy</h1>" }),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		// Abuse page renders
		const abuse = await fetchWorker(new Request(`http://example.com/abuse?id=${id}`));
		expect(abuse.status).toBe(200);
		expect(await abuse.text()).toContain("/api/report");

		// Valid report succeeds and takes the content down
		const report = await fetchWorker(
			new Request("http://example.com/api/report", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ id, reason: "phishing", details: "fake login" }),
			})
		);
		expect(report.status).toBe(200);
		expect(await report.json()).toMatchObject({ ok: true });

		const view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(view.status).toBe(451);
		expect(view.headers.get("x-robots-tag")).toContain("noindex");
		const viewHtml = await view.text();
		expect(viewHtml).toContain("Content Removed");
		expect(viewHtml).toContain("1400875096@qq.com");
		expect(view.headers.get("referrer-policy")).toBe("no-referrer");

		// Invalid id rejected
		const bad = await fetchWorker(
			new Request("http://example.com/api/report", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ id: "not valid!", reason: "other" }),
			})
		);
		expect(bad.status).toBe(400);

		// IP rate limit: 5 reports/hour then 429
		let last = null;
		for (let i = 0; i < 6; i++) {
			last = await fetchWorker(
				new Request("http://example.com/api/report", {
					method: "POST",
					headers: { "Content-Type": "application/json", Origin: "http://example.com" },
					body: JSON.stringify({ id, reason: "other" }),
				})
			);
		}
		expect(last.status).toBe(429);
	});

	it("injects the powered-by badge for anonymous content but not for paid/trial owners", async () => {
		// Anonymous upload → badge
		const anon = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ code: "<!doctype html><body><h1>anon</h1></body>" }),
			})
		);
		const anonId = (await anon.json()).id;
		const anonView = await fetchWorker(new Request(`http://example.com/view/${anonId}`));
		const anonHtml = await anonView.text();
		expect(anonHtml).toContain("Made with Oh My Share");
		expect(anonView.headers.get("referrer-policy")).toBe("no-referrer");
		expect(anonView.headers.get("etag")).toContain("-b");

		// Registered owner gets a 3-day trial entitlement → no badge
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email: `badge-${Date.now()}@test.com`, password: "Passw0rd123" }),
			})
		);
		const registerBody = await register.json();
		expect(register.status).toBe(201);

		// Trial subscription row exists and is active
		const sub = await env.DB.prepare(
			"SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ?"
		).bind(registerBody.user.id).first();
		expect(sub).toBeTruthy();
		expect(sub.plan).toBe("paid");
		expect(sub.status).toBe("trialing");
		expect(sub.current_period_end).toBeGreaterThan(Math.floor(Date.now() / 1000));

		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];
		const owned = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: JSON.stringify({ code: "<!doctype html><body><h1>owned</h1></body>" }),
			})
		);
		const ownedId = (await owned.json()).id;
		const ownedView = await fetchWorker(new Request(`http://example.com/view/${ownedId}`));
		expect(await ownedView.text()).not.toContain("Made with Oh My Share");
		expect(ownedView.headers.get("etag")).not.toContain("-b");
	});

	it("serves the ai-html-publish landing page and alias", async () => {
		const page = await fetchWorker(new Request("http://example.com/ai-html-publish"));
		expect(page.status).toBe(200);
		const html = await page.text();
		expect(html).toContain("Publish AI-Generated HTML");
		expect(html).toContain('<link rel="canonical" href="https://openanthropic.com/ai-html-publish">');
		expect(html).toContain('href="/ai-html-publish"'); // footer link
		expect(html).toContain("Report Abuse");

		const zh = await fetchWorker(new Request("http://example.com/ai-html-publish?lang=zh"));
		expect((await zh.text())).toContain("发布 AI 生成的 HTML");

		// Alias canonicalizes to the primary slug
		const alias = await fetchWorker(new Request("http://example.com/chatgpt-html-share"));
		expect(alias.status).toBe(200);
		expect(await alias.text()).toContain('href="https://openanthropic.com/ai-html-publish"');

		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("/ai-html-publish");
	});

	it("speaks A2A JSON-RPC: SendMessage publishes, GetTask resolves", async () => {
		// agent card declares a JSONRPC transport
		const card = await fetchWorker(new Request("http://example.com/.well-known/agent-card.json"));
		expect(card.status).toBe(200);
		const cardJson = await card.json();
		expect(cardJson.supportedInterfaces[0]).toMatchObject({
			protocolBinding: "JSONRPC",
			protocolVersion: "1.0",
		});
		expect(cardJson.supportedInterfaces[0].url).toContain("/a2a");

		// GET on the endpoint is 405
		expect((await fetchWorker(new Request("http://example.com/a2a"))).status).toBe(405);

		// SendMessage with HTML → completed task with share URL
		const send = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "SendMessage",
					params: {
						message: {
							messageId: "m1",
							role: "ROLE_USER",
							parts: [
								{ text: "<!doctype html><html><body><h1>a2a page</h1></body></html>" },
							],
						},
					},
				}),
			})
		);
		expect(send.status).toBe(200);
		const sent = await send.json();
		expect(sent.jsonrpc).toBe("2.0");
		expect(sent.id).toBe(1);
		expect(sent.result.task.status.state).toBe("TASK_STATE_COMPLETED");
		const shareText = sent.result.task.artifacts[0].parts.map((p) => p.text).join("\n");
		expect(shareText).toContain("/view/");
		const shareId = sent.result.task.id;
		expect(shareId).toMatch(/^[a-f0-9]{12}$/);

		// The shared page is live (and carries the badge, owner is anonymous)
		const view = await fetchWorker(new Request(`http://example.com/view/${shareId}`));
		expect(view.status).toBe(200);
		expect(await view.text()).toContain("a2a page");

		// GetTask synthesizes the completed task from the files table
		const getTask = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "GetTask", params: { id: shareId } }),
			})
		);
		const task = await getTask.json();
		expect(task.result.status.state).toBe("TASK_STATE_COMPLETED");

		// Unknown task → -32001, unknown method → -32601, bad JSON → -32700
		const missing = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "GetTask", params: { id: "deadbeef0000" } }),
			})
		);
		expect((await missing.json()).error.code).toBe(-32001);

		const nope = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "Wibble" }),
			})
		);
		expect((await nope.json()).error.code).toBe(-32601);

		const broken = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{oops",
			})
		);
		expect(broken.status).toBe(200);
		expect((await broken.json()).error.code).toBe(-32700);

		// Non-HTML message → help text, no upload
		const help = await fetchWorker(
			new Request("http://example.com/a2a", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 5,
					method: "SendMessage",
					params: {
						message: {
							messageId: "m2",
							role: "ROLE_USER",
							parts: [{ text: "hello what can you do" }],
						},
					},
				}),
			})
		);
		const helpJson = await help.json();
		expect(helpJson.result.message.parts[0].text).toContain("Commands");
	});

	it("exposes search_gallery through the MCP server", async () => {
		const list = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
			})
		);
		expect(list.status).toBe(200);
		const text = await list.text();
		expect(text).toContain("search_gallery");
		expect(JSON.parse(text).result.tools.map((tool) => tool.name)).toContain("search_gallery");

		// initialize reports the new server version
		const init = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "initialize",
					params: {
						protocolVersion: "2025-06-18",
						capabilities: {},
						clientInfo: { name: "test", version: "1.0" },
					},
				}),
			})
		);
		expect(await init.text()).toContain("2.2.0");
	});

	it("answers HEAD like GET on HTML routes (200, headers, empty body)", async () => {
		const head = await fetchWorker(new Request("http://example.com/", { method: "HEAD" }));
		expect(head.status).toBe(200);
		expect(head.headers.get("content-type")).toContain("text/html");
		expect(await head.text()).toBe("");

		const galleryHead = await fetchWorker(
			new Request("http://example.com/gallery", { method: "HEAD" })
		);
		expect(galleryHead.status).toBe(200);

		const unknownHead = await fetchWorker(
			new Request("http://example.com/no-such-page", { method: "HEAD" })
		);
		expect(unknownHead.status).toBe(404);
	});

	it("serves terms and privacy pages linked from the footer", async () => {
		const terms = await fetchWorker(new Request("http://example.com/terms"));
		expect(terms.status).toBe(200);
		const termsHtml = await terms.text();
		expect(termsHtml).toContain("Terms of Service");
		expect(termsHtml).toContain("Oh My Share");
		expect(terms.headers.get("content-type")).toContain("text/html");

		const privacy = await fetchWorker(new Request("http://example.com/privacy"));
		expect(privacy.status).toBe(200);
		expect(await privacy.text()).toContain("Privacy Policy");

		const zhTerms = await fetchWorker(
			new Request("http://example.com/terms?lang=zh")
		);
		expect(zhTerms.status).toBe(200);
		expect(await zhTerms.text()).toContain("服务条款");

		const home = await fetchWorker(new Request("http://example.com/"));
		const homeHtml = await home.text();
		expect(homeHtml).toContain('href="/terms"');
		expect(homeHtml).toContain('href="/privacy"');
		expect(homeHtml).toContain('href="/feed.xml"');
	});

	it("serves an RSS feed of published gallery works", async () => {
		const feed = await fetchWorker(new Request("http://example.com/feed.xml"));
		expect(feed.status).toBe(200);
		expect(feed.headers.get("content-type")).toContain("application/rss+xml");
		const xml = await feed.text();
		expect(xml).toContain("<rss version=\"2.0\"");
		expect(xml).toContain("<channel>");
		expect(xml).toContain("https://openanthropic.com/feed.xml");
	});

	it("keeps llms.txt, sitemap and og tags consistent", async () => {
		const llms = await fetchWorker(new Request("http://example.com/llms.txt"));
		const llmsText = await llms.text();
		expect(llms.status).toBe(200);
		expect(llmsText).not.toContain("[llms.txt registration]");
		expect(llmsText).toContain("registry.modelcontextprotocol.io");
		expect(llmsText).toContain("/feed.xml");
		expect(llmsText).toContain("/terms");

		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		const sitemapXml = await sitemap.text();
		expect(sitemap.status).toBe(200);
		expect(sitemapXml).toContain("https://openanthropic.com/chatgpt-html-share");
		expect(sitemapXml).toContain("https://openanthropic.com/terms");
		expect(sitemapXml).toContain("https://openanthropic.com/privacy");

		const home = await fetchWorker(new Request("http://example.com/"));
		expect(await home.text()).toContain('property="og:site_name"');
	});

	it("injects social preview meta into shared view pages", async () => {
		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({
					code: "<html><head><title>inner</title></head><body>og-test</body></html>",
					title: "社交预览测试",
					description: "预览描述内容",
				}),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		const view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		const html = await view.text();
		expect(html).toContain('property="og:site_name" content="Oh My Share"');
		expect(html).toContain('property="og:title" content="社交预览测试"');
		expect(html).toContain('property="og:description" content="预览描述内容"');
		expect(html).toContain('name="twitter:card" content="summary_large_image"');
		expect(html).toContain(`og:url" content="http://example.com/view/${id}"`);

		// Authored og:title is respected — no duplicate injection
		const authored = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({
					code: '<html><head><meta property="og:title" content="mine"></head><body>x</body></html>',
				}),
			})
		);
		const { id: authoredId } = await authored.json();
		const authoredView = await fetchWorker(
			new Request(`http://example.com/view/${authoredId}`)
		);
		const authoredHtml = await authoredView.text();
			expect(authoredHtml.match(/og:title/g)).toHaveLength(1);
		expect(authoredHtml).not.toContain('og:site_name');
	});

	it("serves the product demo page that drives the real app", async () => {
		const demo = await fetchWorker(new Request("http://example.com/demo"));
		expect(demo.status).toBe(200);
		const html = await demo.text();
		expect(html).toContain('id="demoApp"');
		expect(html).toContain('id="demoView"');
		expect(html).toContain('id="demoCursor"');
		expect(html).toContain('id="demoReplay"');
		expect(html).toContain('data-caption="3"');
		expect(html).toContain('data-err=');
		// drives the real product hooks
		expect(html).toContain('panel-code');
		expect(html).toContain('codeInput');

		const en = await fetchWorker(new Request("http://example.com/demo?lang=en"));
		expect(en.status).toBe(200);
		expect(await en.text()).toContain("Paste code in the real app");

		const headDemo = await fetchWorker(
			new Request("http://example.com/demo", { method: "HEAD" })
		);
		expect(headDemo.status).toBe(200);
		expect(headDemo.headers.get("cache-control")).toContain("max-age");

		const home = await fetchWorker(new Request("http://example.com/"));
		expect(await home.text()).toContain('href="/demo"');

		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("https://openanthropic.com/demo");

		const limited2 = await fetchWorker(new Request("http://example.com/demo"));
		expect(await limited2.text()).toContain('data-demo-limited="0"');
	});

	it("honors expiresIn for MCP uploads and purges expired files", async () => {
		// Tests share one hourly quota bucket; reset it for this case.
		await env.DB.prepare("DELETE FROM rate_limits").run();

		// MCP upload used to ignore expiresIn — rows never expired, so expired
		// content lived in D1 + R2 forever.
		const publish = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: {
						name: "upload",
						arguments: { content: "<h1>mcp</h1>", filename: "mcp.html", expiresIn: "1h" },
					},
				}),
			})
		);
		expect(publish.status).toBe(200);
		const payload = JSON.parse(await publish.text());
		const result = JSON.parse(payload.result.content[0].text);
		expect(result.url).toContain("/view/");
		expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

		const row = await env.DB.prepare("SELECT expires_at FROM files WHERE id = ?")
			.bind(result.id)
			.first();
		expect(row.expires_at).toBe(result.expiresAt);

		const { purgeExpiredFiles } = await import("../src/handlers/purge.js");
		const removed = await purgeExpiredFiles(
			{
				DB: env.DB,
				MY_BUCKET: { delete: async () => {} },
			},
			50
		);
		expect(removed).toBeGreaterThanOrEqual(0);

		// A past-expiry row is actually deleted, not just hidden
		const expiredId = "expiredtest01";
		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
		)
			.bind(expiredId, "gone.html", null, 1, "edt_x", 1, 1)
			.run();
		await purgeExpiredFiles({ DB: env.DB, MY_BUCKET: { delete: async () => {} } }, 50);
		const gone = await env.DB.prepare("SELECT id FROM files WHERE id = ?").bind(expiredId).first();
		expect(gone).toBeNull();
	});

	it("serves the MCP guide with per-client install configs", async () => {
		const guide = await fetchWorker(new Request("http://example.com/mcp-guide"));
		expect(guide.status).toBe(200);
		const html = await guide.text();
		expect(html).toContain('data-client-tab="claude-desktop"');
		expect(html).toContain('data-client-tab="cursor"');
		expect(html).toContain('data-client-tab="vscode"');
		expect(html).toContain('https://openanthropic.com/mcp');
		expect(html).toContain('claude mcp add --transport http');
		expect(html).toContain('search_gallery');
		expect(html).toContain('auth-badge oauth');
		// per-client steps + ready-to-paste agent prompts
		expect(html).toContain('id="prompt-claude-desktop"');
		expect(html).toContain('id="prompt-cursor"');
		expect(html).toContain('class="client-steps"');
		expect(html).toContain('2.2.0');

		const en = await fetchWorker(new Request("http://example.com/mcp-guide?lang=en"));
		expect(en.status).toBe(200);
		expect(await en.text()).toContain("Claude Desktop");

		const headGuide = await fetchWorker(
			new Request("http://example.com/mcp-guide", { method: "HEAD" })
		);
		expect(headGuide.status).toBe(200);

		// nav + footer now point at the guide
		const home = await fetchWorker(new Request("http://example.com/"));
		expect(await home.text()).toContain('href="/mcp-guide"');

		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("https://openanthropic.com/mcp-guide");
	});
});
