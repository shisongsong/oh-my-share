import {
	applyD1Migrations,
	createExecutionContext,
	env,
	SELF,
	waitOnExecutionContext,
} from "cloudflare:test";
import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src";
import { handleUpload } from "../src/handlers/upload.js";
import { CORS_RATE_PER_HOUR } from "../src/handlers/cors-proxy.js";
import { detectLang } from "../src/i18n.js";
import { validateSlug } from "../src/security.js";
import { renderDocument } from "../src/ui/render-document.js";
import { bytesToBase64Url, hashPassword, sha256 } from "../src/crypto.js";

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

async function fetchWorker(request, envOverride) {
	const context = createExecutionContext();
	const response = await worker.fetch(request, envOverride || env, context);
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

	it("reports content: hides after three distinct reporters, blocks views with 451, and rate limits", async () => {
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

		// A single report no longer takes content down; it takes three distinct reporters.
		const report = await fetchWorker(
			new Request("http://example.com/api/report", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ id, reason: "phishing", details: "fake login" }),
			})
		);
		expect(report.status).toBe(200);
		expect(await report.json()).toMatchObject({ ok: true, hidden: false });

		const view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(view.status).toBe(200);

		// The same reporter cannot inflate the count.
		const duplicate = await fetchWorker(
			new Request("http://example.com/api/report", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ id, reason: "other" }),
			})
		);
		expect(await duplicate.json()).toMatchObject({ ok: true, hidden: false });
		const afterOne = await env.DB.prepare(
			"SELECT report_count, reported_at FROM files WHERE id = ?"
		).bind(id).first();
		expect(afterOne.report_count).toBe(1);
		expect(afterOne.reported_at).toBeNull();

		// Cross-site reports are rejected.
		const crossSite = await fetchWorker(
			new Request("http://example.com/api/report", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
				body: JSON.stringify({ id, reason: "other" }),
			})
		);
		expect(crossSite.status).toBe(403);

		for (const ip of ["203.0.113.2", "203.0.113.3"]) {
			const next = await fetchWorker(
				new Request("http://example.com/api/report", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: "http://example.com",
						"CF-Connecting-IP": ip,
					},
					body: JSON.stringify({ id, reason: "other" }),
				})
			);
			expect(next.status).toBe(200);
		}

		const reportedView = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(reportedView.status).toBe(451);
		expect(reportedView.headers.get("x-robots-tag")).toContain("noindex");
		const viewHtml = await reportedView.text();
		expect(viewHtml).toContain("Content Removed");
		expect(viewHtml).toContain("1400875096@qq.com");
		expect(reportedView.headers.get("referrer-policy")).toBe("no-referrer");

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

	it("injects the badge and signup hint for anonymous content but not for signed-in owners", async () => {
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
		expect(anonHtml).toContain("Sign up to upload without this badge");
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

		// Even without any paid/trial entitlement, signed-in owners stay badge-free.
		await env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ?")
			.bind(registerBody.user.id)
			.run();
		const freeView = await fetchWorker(new Request(`http://example.com/view/${ownedId}`));
		expect(await freeView.text()).not.toContain("Made with Oh My Share");
	});


	it("uploads a static-site folder for signed-in users and serves it with sandboxed assets", async () => {
		const ip = "198.51.100.60";
		const email = `site-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					"CF-Connecting-IP": ip,
				},
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];

		const makeForm = () => {
			const form = new FormData();
			form.append(
				"files",
				new File(
					['<!doctype html><html><head><link rel="stylesheet" href="assets/style.css"></head><body><h1>Static Site</h1></body></html>'],
					"demo/index.html",
					{ type: "text/html" }
				)
			);
			form.append(
				"files",
				new File(["h1{color:red}"], "demo/assets/style.css", { type: "text/css" })
			);
			form.append(
				"files",
				new File([new Uint8Array([137, 80, 78, 71])], "demo/img/logo.png", { type: "image/png" })
			);
			form.append(
				"files",
				new File(["<!doctype html><title>Docs</title>"], "demo/docs/index.html", { type: "text/html" })
			);
			form.append("title", "Static demo");
			return form;
		};

		// Anonymous folder uploads are rejected.
		const anon = await fetchWorker(
			new Request("http://example.com/api/upload-site", {
				method: "POST",
				headers: { Origin: "http://example.com", "CF-Connecting-IP": ip },
				body: makeForm(),
			})
		);
		expect(anon.status).toBe(401);
		expect((await anon.json()).code).toBe("errSiteAuth");

		// The root must contain index.html.
		const missingIndex = new FormData();
		missingIndex.append("files", new File(["body{}"], "demo/style.css", { type: "text/css" }));
		const noIndex = await fetchWorker(
			new Request("http://example.com/api/upload-site", {
				method: "POST",
				headers: { Origin: "http://example.com", Cookie: cookie, "CF-Connecting-IP": ip },
				body: missingIndex,
			})
		);
		expect(noIndex.status).toBe(400);
		expect((await noIndex.json()).code).toBe("errSiteNoIndex");

		const upload = await fetchWorker(
			new Request("http://example.com/api/upload-site", {
				method: "POST",
				headers: { Origin: "http://example.com", Cookie: cookie, "CF-Connecting-IP": ip },
				body: makeForm(),
			})
		);
		expect(upload.status).toBe(200);
		const payload = await upload.json();
		expect(payload.url).toBe(`http://example.com/s/${payload.id}/`);
		expect(payload.files).toBe(4);
		const id = payload.id;

		const entry = await fetchWorker(new Request(`http://example.com/s/${id}/`));
		expect(entry.status).toBe(200);
		expect(entry.headers.get("content-security-policy")).toContain("sandbox");
		expect(await entry.text()).toContain("Static Site");

		const css = await fetchWorker(new Request(`http://example.com/s/${id}/assets/style.css`));
		expect(css.status).toBe(200);
		expect(css.headers.get("content-type")).toContain("text/css");
		expect(css.headers.get("access-control-allow-origin")).toBe("*");
		expect(await css.text()).toContain("color:red");

		const directory = await fetchWorker(new Request(`http://example.com/s/${id}/docs`));
		expect(directory.status).toBe(301);
		expect(directory.headers.get("location")).toBe(`/s/${id}/docs/`);
		expect((await fetchWorker(new Request(`http://example.com/s/${id}/docs/`))).status).toBe(200);

		expect((await fetchWorker(new Request(`http://example.com/s/${id}/%2e%2e%2fsecret`))).status).toBe(404);

		const view = await fetchWorker(new Request(`http://example.com/view/${id}`));
		expect(view.status).toBe(302);
		expect(view.headers.get("location")).toBe(`http://example.com/s/${id}/`);

		// Folder shares stay out of the gallery.
		const publish = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: true }),
			})
		);
		expect(publish.status).toBe(400);
		expect((await publish.json()).code).toBe("errCannotPublish");

		const assets = await fetchWorker(
			new Request("http://example.com/api/assets", { headers: { Cookie: cookie } })
		);
		const listed = (await assets.json()).assets.find((asset) => asset.id === id);
		expect(listed.kind).toBe("site");
		expect(listed.url).toBe(`http://example.com/s/${id}/`);

		const removed = await fetchWorker(
			new Request(`http://example.com/api/assets/${id}`, {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(removed.status).toBe(200);
		expect((await fetchWorker(new Request(`http://example.com/s/${id}/`))).status).toBe(404);
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
		const toolNames = JSON.parse(text).result.tools.map((tool) => tool.name);
		expect(toolNames).toContain("search_gallery");
		expect(toolNames).toContain("upload_site");

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
		expect(await init.text()).toContain("2.3.0");
	});

	it("makes MCP uploads retry-safe and attributes their source", async () => {
		await env.DB.prepare("DELETE FROM rate_limits").run();
		const call = (args, id = 1) =>
			fetchWorker(
				new Request("http://example.com/mcp", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"User-Agent": "mcp-test-agent/1.0",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id,
						method: "tools/call",
						params: { name: "upload", arguments: args },
					}),
				})
			);

		const args = {
			content: "<h1>idempotent</h1>",
			filename: "retry.html",
			title: "Retry-safe page",
			idempotencyKey: "agent-run-42",
		};
		const first = await call(args, 1);
		expect(first.status).toBe(200);
		const firstBody = JSON.parse(await first.text());
		expect(firstBody.result.isError).toBe(false);
		const created = firstBody.result.structuredContent;
		expect(created.id).toMatch(/^[a-z0-9]+$/);
		expect(created.reused).toBe(false);

		const row = await env.DB.prepare(
			"SELECT source, user_agent, title, idempotency_key FROM files WHERE id = ?"
		).bind(created.id).first();
		expect(row.source).toBe("mcp");
		expect(row.user_agent).toBe("mcp-test-agent/1.0");
		expect(row.title).toBe("Retry-safe page");
		expect(row.idempotency_key).toBeTruthy();

		const second = await call(args, 2);
		const secondBody = JSON.parse(await second.text());
		expect(secondBody.result.structuredContent.reused).toBe(true);
		expect(secondBody.result.structuredContent.id).toBe(created.id);

		const logged = await env.DB.prepare(
			"SELECT tool, status, client FROM mcp_calls ORDER BY id DESC LIMIT 1"
		).first();
		expect(logged.tool).toBe("upload");
		expect(logged.status).toBe("ok");
		expect(logged.client).toBe("mcp-test-agent/1.0");
	});

	it("publishes a multi-file static site through MCP for signed-in users", async () => {
		await env.DB.prepare("DELETE FROM rate_limits").run();
		const email = `mcp-site-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];
		const token = cookie.slice("osh_session=".length);

		const call = (args) =>
			fetchWorker(
				new Request("http://example.com/mcp", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						"User-Agent": "mcp-site-agent/1.0",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "tools/call",
						params: { name: "upload_site", arguments: args },
					}),
				})
			);

		const response = await call({
			files: [
				{ path: "demo/index.html", content: "<!doctype html><link rel=stylesheet href=app.css><h1>MCP site</h1>" },
				{ path: "demo/app.css", content: "h1{color:#4f6b52}" },
			],
			title: "Agent site",
		});
		expect(response.status).toBe(200);
		const body = JSON.parse(await response.text());
		expect(body.result.isError).toBe(false);
		const site = body.result.structuredContent;
		expect(site.kind).toBe("site");
		expect(site.url).toContain(`/s/${site.id}/`);
		expect(site.files).toBe(2);

		const page = await fetchWorker(new Request(`http://example.com/s/${site.id}/`));
		expect(page.status).toBe(200);
		expect(await page.text()).toContain("MCP site");

		const row = await env.DB.prepare(
			"SELECT kind, source, user_agent, file_count FROM files WHERE id = ?"
		).bind(site.id).first();
		expect(row.kind).toBe("site");
		expect(row.source).toBe("mcp");
		expect(row.user_agent).toBe("mcp-site-agent/1.0");
		expect(row.file_count).toBe(2);

		const anonymous = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 2,
					method: "tools/call",
					params: { name: "upload_site", arguments: { files: [{ path: "index.html", content: "x" }] } },
				}),
			})
		);
		expect(anonymous.status).toBe(401);
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
		expect(sitemapXml).not.toContain("https://openanthropic.com/chatgpt-html-share");
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
		expect(html).toContain('2.3.0');

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

		// SEO: hreflang + FAQ structured data
		expect(html).toContain('hreflang="en" href="https://openanthropic.com/mcp-guide"');
		expect(html).toContain('"@type":"FAQPage"');

		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("https://openanthropic.com/mcp-guide");
	});

	it("lets answer-engine crawlers index public pages via robots.txt", async () => {
		const robots = await fetchWorker(new Request("http://example.com/robots.txt"));
		const text = await robots.text();
		for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"]) {
			expect(text).toContain(`User-agent: ${bot}`);
		}
		// private endpoints stay disallowed for everyone
		expect(text).toContain("Disallow: /api/");
	});
});

describe("CORS proxy", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function proxyUrl(target, key) {
		return `http://example.com/corsproxy?url=${encodeURIComponent(target)}&key=${encodeURIComponent(key)}`;
	}

	async function registerUser(tag) {
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email: `${tag}-${Date.now()}@test.com`, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		return (register.headers.get("set-cookie") || "").split(";")[0];
	}

	async function insertKey(id) {
		const key = `ck_${id.replace(/-/g, "").padEnd(40, "a").slice(0, 40)}`;
		await env.DB.prepare(
			"INSERT INTO api_keys (id, user_id, key, created_at) VALUES (?, ?, ?, ?)"
		)
			.bind(id, `user-${id}`, key, Math.floor(Date.now() / 1000))
			.run();
		return key;
	}

	it("restricts the admin dashboard to ADMIN_EMAILS and hides internal rows", async () => {
		const now = Math.floor(Date.now() / 1000);
		// cloudflare:test hands out a proxy env, so override via a read-only proxy
		// instead of mutating it.
		const adminEnv = new Proxy(env, {
			get(target, prop) {
				if (prop === "ADMIN_EMAILS") return "boss@openanthropic.com";
				return Reflect.get(target, prop);
			},
		});

		async function register(email) {
			const res = await fetchWorker(
				new Request("http://example.com/api/auth/register", {
					method: "POST",
					headers: { "Content-Type": "application/json", Origin: "http://example.com" },
					body: JSON.stringify({ email, password: "Passw0rd123" }),
				})
			);
			expect(res.status).toBe(201);
			return (res.headers.get("set-cookie") || "").split(";")[0];
		}

		const adminCookie = await register("boss@openanthropic.com");
		const userCookie = await register("real.person@gmail.com");
		const boss = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
			.bind("boss@openanthropic.com")
			.first();
		const testUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
			.bind("real.person@gmail.com")
			.first();

		await env.DB.prepare(
			"INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
		)
			.bind("testuserid01", "qa@test.com", "x", "y", now)
			.run();

		const insertFile = env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, published_at, encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		);
		await insertFile.bind("adminwork001", "adminwork001.html", boss.id, now, "edt_admin_secret", now, 0, 0).run();
		await insertFile.bind("testwork0001", "testwork0001.html", "testuserid01", now, "edt_test_secret", now, 0, 0).run();
		await insertFile.bind("e2ework00001", "e2ework00001.html", null, now, "edt_e2e_secret", now, 0, 0).run();
		await insertFile.bind("realwork0001", "realwork0001.html", null, now, "edt_real_secret", now, now, 1).run();
		await env.DB.prepare(
			"INSERT INTO visits (file_id, visited_at, ip_hash, country) VALUES (?, ?, ?, ?)"
		)
			.bind("realwork0001", now, "hash1", "ES")
			.run();

		// anonymous visitors get a sign-in prompt, never data
		const anon = await fetchWorker(new Request("http://example.com/admin"), adminEnv);
		expect(anon.status).toBe(401);
		expect(anon.headers.get("cache-control")).toContain("no-store");
		expect(await anon.text()).not.toContain("real.person@gmail.com");

		// signed-in but not allowlisted -> 404, no hint that /admin exists
		const outsider = await fetchWorker(
			new Request("http://example.com/admin", { headers: { Cookie: userCookie } }),
			adminEnv
		);
		expect(outsider.status).toBe(404);

		// admin sees the real rows only; own/test rows are hidden by default
		const admin = await fetchWorker(
			new Request("http://example.com/admin", { headers: { Cookie: adminCookie } }),
			adminEnv
		);
		expect(admin.status).toBe(200);
		expect(admin.headers.get("x-robots-tag")).toContain("noindex");
		const html = await admin.text();
		expect(html).toContain("real.person@gmail.com");
		expect(html).toContain("realwork0001");
		expect(html).not.toContain("adminwork001");
		expect(html).not.toContain("testwork0001");
		expect(html).not.toContain("e2ework00001");
		expect(html).not.toContain("edt_admin_secret");
		expect(html).not.toContain("edt_real_secret");

		// opt-in shows everything
		const all = await fetchWorker(
			new Request("http://example.com/admin?all=1", { headers: { Cookie: adminCookie } }),
			adminEnv
		);
		const allHtml = await all.text();
		expect(allHtml).toContain("adminwork001");
		expect(allHtml).toContain("testwork0001");
		expect(allHtml).toContain("e2ework00001");
		expect(allHtml).not.toContain("edt_admin_secret");

		// without ADMIN_EMAILS nobody is an admin
		const misconfigured = await fetchWorker(
			new Request("http://example.com/admin", { headers: { Cookie: adminCookie } }),
			env
		);
		expect(misconfigured.status).toBe(404);
	});

	it("protects per-link stats behind the edit token or the owning account", async () => {
		const now = Math.floor(Date.now() / 1000);
		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)"
		)
			.bind("statssecret1", "statssecret1.html", null, now, "edt_stats_secret", now, "hash")
			.run();

		// no credential -> 401, even though the row exists
		const anon = await fetchWorker(new Request("http://example.com/api/stats/statssecret1"));
		expect(anon.status).toBe(401);
		expect((await anon.json()).code).toBe("errAuthRequired");

		// wrong token -> 401
		const wrong = await fetchWorker(
			new Request("http://example.com/api/stats/statssecret1?token=nope")
		);
		expect(wrong.status).toBe(401);

		// edit token works
		const withToken = await fetchWorker(
			new Request("http://example.com/api/stats/statssecret1?token=edt_stats_secret")
		);
		expect(withToken.status).toBe(200);
		const body = await withToken.json();
		expect(body.file.id).toBe("statssecret1");
		expect(body.stats.totalVisits).toBe(0);

		// unknown ids still 404 without leaking anything else
		const missing = await fetchWorker(
			new Request("http://example.com/api/stats/doesnotexist1?token=x")
		);
		expect(missing.status).toBe(404);
	});

	it("serves bilingual how-to guides with FAQ schema and sitemap entries", async () => {
		const index = await fetchWorker(new Request("http://example.com/guides"));
		expect(index.status).toBe(200);
		const indexHtml = await index.text();
		expect(indexHtml).toContain("Guides");
		expect(indexHtml).toContain('href="/guides/how-to-share-html-file-online"');
		expect(indexHtml).toContain('<link rel="canonical" href="https://openanthropic.com/guides">');

		// a guide page: article + FAQPage + breadcrumbs, and real body content
		const guide = await fetchWorker(
			new Request("http://example.com/guides/how-to-share-html-file-online")
		);
		expect(guide.status).toBe(200);
		const html = await guide.text();
		expect(html).toContain('"@type":"TechArticle"');
		expect(html).toContain('"@type":"FAQPage"');
		expect(html).toContain('"@type":"BreadcrumbList"');
		expect(html).toContain('<h2>'); // rendered sections
		expect(html).toContain('<pre><code>'); // code blocks survive
		expect(html).toContain("<title>How to Share an HTML File Online (Free, No Signup) - Oh My Share</title>");

		// chinese version self-canonicalizes and has its own title
		const zh = await fetchWorker(
			new Request("http://example.com/guides/how-to-share-html-file-online?lang=zh")
		);
		const zhHtml = await zh.text();
		expect(zhHtml).toContain('rel="canonical" href="https://openanthropic.com/guides/how-to-share-html-file-online?lang=zh"');
		expect(zhHtml).toContain("在线分享 HTML 文件");

		// unknown guide 404s
		const missing = await fetchWorker(new Request("http://example.com/guides/nope"));
		expect(missing.status).toBe(404);

		// sitemap lists the index and every guide
		const xml = await (await fetchWorker(new Request("http://example.com/sitemap.xml"))).text();
		expect(xml).toContain("<loc>https://openanthropic.com/guides</loc>");
		expect(xml).toContain("<loc>https://openanthropic.com/guides/share-ai-generated-html</loc>");
		expect(xml).toContain('hreflang="zh" href="https://openanthropic.com/guides?lang=zh"');
		expect(xml).not.toContain("<loc>https://openanthropic.com/chatgpt-html-share</loc>");

		// linked from the footer everywhere
		const home = await (await fetchWorker(new Request("http://example.com/"))).text();
		expect(home).toContain('href="/guides"');
	});

	it("self-canonicalizes every language version and ties them with hreflang", async () => {
		// pages that build canonicals from the canonical site origin
		for (const path of ["/", "/demo", "/mcp-guide", "/terms", "/contact"]) {
			const base = `https://openanthropic.com${path}`;
			const enHtml = await (await fetchWorker(new Request(`http://example.com${path}?lang=en`))).text();
			expect(enHtml).toContain(`<link rel="canonical" href="${base}">`);
			expect(enHtml).toContain(`hreflang="zh" href="${base}?lang=zh"`);
			expect(enHtml).toContain(`hreflang="x-default" href="${base}"`);

			// chinese version must canonicalize to itself, otherwise zh can never rank
			const zhHtml = await (await fetchWorker(new Request(`http://example.com${path}?lang=zh`))).text();
			expect(zhHtml).toContain(`<link rel="canonical" href="${base}?lang=zh">`);
		}

		// gallery builds its canonical from the request origin
		const galleryEn = await (await fetchWorker(new Request("http://example.com/gallery?lang=en"))).text();
		expect(galleryEn).toContain('<link rel="canonical" href="http://example.com/gallery">');
		const galleryZh = await (await fetchWorker(new Request("http://example.com/gallery?lang=zh"))).text();
		expect(galleryZh).toContain('<link rel="canonical" href="http://example.com/gallery?lang=zh">');
	});

	it("emits BreadcrumbList and Organization structured data", async () => {
		const home = await fetchWorker(new Request("http://example.com/"));
		const homeHtml = await home.text();
		expect(homeHtml).toContain('"@type": "WebSite"');
		expect(homeHtml).toContain('"@type": "Organization"');
		expect(homeHtml).toContain('"@type": "SearchAction"');
		expect(homeHtml).toContain('1400875096@qq.com');

		for (const path of ["/demo", "/mcp-guide", "/terms", "/contact"]) {
			const html = await (await fetchWorker(new Request(`http://example.com${path}`))).text();
			expect(html).toContain('"@type":"BreadcrumbList"');
			expect(html).toContain('"position":1');
		}

		const contact = await fetchWorker(new Request("http://example.com/contact"));
		expect(await contact.text()).toContain('"@type":"ContactPage"');
	});

	it("serves hreflang alternates in the sitemap and agent docs in llms-full.txt", async () => {
		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		const xml = await sitemap.text();
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="zh" href="https://openanthropic.com/gallery?lang=zh" />');
		expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default"');
		// agent docs stay monolingual
		const authMdBlock = xml.split('<loc>https://openanthropic.com/auth.md</loc>')[1]?.split('</url>')[0] || "";
		expect(authMdBlock).not.toContain("xhtml:link");

		const robots = await fetchWorker(new Request("http://example.com/robots.txt"));
		const robotsTxt = await robots.text();
		expect(robotsTxt).toContain("User-agent: Claude-SearchBot");
		expect(robotsTxt).toContain("User-agent: Bingbot");
		expect(robotsTxt).toContain("User-agent: Meta-ExternalAgent");

		const full = await fetchWorker(new Request("http://example.com/llms-full.txt"));
		expect(full.status).toBe(200);
		expect(full.headers.get("content-type")).toContain("text/markdown");
		const text = await full.text();
		expect(text).toContain("Oh My Share");
		expect(text).toContain("1400875096@qq.com");
		expect(text).toContain("list_assets");
	});

	it("shows the contact email in every footer and serves the WeChat QR page", async () => {
		// the QR image lives in R2
		await env.MY_BUCKET.put("wechat-qrcode.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));

		const qr = await fetchWorker(new Request("http://example.com/wechat-qrcode.jpg"));
		expect(qr.status).toBe(200);
		expect(qr.headers.get("content-type")).toBe("image/jpeg");

		const missing = await fetchWorker(new Request("http://example.com/wechat-qrcode-missing.jpg"));
		expect(missing.status).toBe(404);

		// contact page: email, QR image and copy button, in both languages
		const page = await fetchWorker(new Request("http://example.com/contact"));
		expect(page.status).toBe(200);
		const html = await page.text();
		expect(html).toContain("1400875096@qq.com");
		expect(html).toContain("mailto:1400875096@qq.com");
		expect(html).toContain("/wechat-qrcode.jpg");
		expect(html).toContain('id="contactCopy"');
		expect(html).toContain("<title>Contact - Oh My Share</title>");

		const zh = await fetchWorker(
			new Request("http://example.com/contact", { headers: { "Accept-Language": "zh-CN,zh;q=0.9" } })
		);
		expect(await zh.text()).toContain("联系方式");

		// every page that renders the shared footer exposes the contact column
		for (const path of ["/", "/gallery", "/mcp-guide?lang=en"]) {
			const other = await fetchWorker(new Request(`http://example.com${path}`));
			const otherHtml = await other.text();
			expect(otherHtml).toContain('href="mailto:1400875096@qq.com"');
			expect(otherHtml).toContain('data-i18n="footerContact"');
			expect(otherHtml).toContain('href="/contact"');
		}
	});

	it("serves the bilingual product page with key console and playground", async () => {
		const page = await fetchWorker(new Request("http://example.com/corsproxy"));
		expect(page.status).toBe(200);
		expect(page.headers.get("content-type")).toContain("text/html");
		const html = await page.text();
		expect(html).toContain("openanthropic.com/corsproxy?key=");
		expect(html).toContain('id="key-console"');
		expect(html).toContain('id="ckAuthForm"');
		expect(html).toContain('id="pgKey"');
		expect(html).toContain('id="pgForm"');
		expect(html).toContain("API key");
		expect(html).toContain("100");
		expect(html).toContain('href="/corsproxy"');

		const zh = await fetchWorker(
			new Request("http://example.com/corsproxy", {
				headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
			})
		);
		expect(await zh.text()).toContain("终结跨域报错");

		const head = await fetchWorker(
			new Request("http://example.com/corsproxy", { method: "HEAD" })
		);
		expect(head.status).toBe(200);
	});

	it("keeps nav and footer links consistent across home, guide, gate and viewer pages", async () => {
		const home = await fetchWorker(new Request("http://example.com/"));
		const homeHtml = await home.text();
		expect(homeHtml).toContain('href="/corsproxy"');
		expect(homeHtml).toContain('href="/community" data-i18n="navGallery"');
		// instant client-side language switch: hero + footer are tagged
		expect(homeHtml).toContain('data-i18n="heroTitleLead"');
		expect(homeHtml).toContain('data-i18n="heroSubtitle"');
		expect(homeHtml).toContain('data-i18n="footerDesc"');
		expect(homeHtml).toContain('data-i18n="footerDemo"');

		// password gate page keeps the shared chrome
		const gateId = "testgategate01";
		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, expires_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		)
			.bind(gateId, "secret.html", null, Math.floor(Date.now() / 1000), "edt_x", Math.floor(Date.now() / 1000), null, "deadbeef")
			.run();
		const gate = await fetchWorker(new Request(`http://example.com/view/${gateId}`));
		expect(gate.status).toBe(200);
		const gateHtml = await gate.text();
		expect(gateHtml).toContain('class="nav"');
		expect(gateHtml).toContain('class="footer"');
		expect(gateHtml).toContain('href="/corsproxy"');
		expect(gateHtml).toContain('href="/gallery"');

		// encrypted viewer wrapper keeps the shared chrome
		const { renderEncryptedViewer } = await import("../src/ui/viewer.js");
		const viewer = renderEncryptedViewer(
			"abc123",
			{ version: 1, iv: "AAAA", salt: "BBBB", iterations: 100000, keyMode: "random" },
			{ title: "t", origin: "http://example.com" },
			"zh"
		);
		expect(viewer).toContain('class="nav"');
		expect(viewer).toContain('class="footer"');
		expect(viewer).toContain('href="/corsproxy"');
		expect(viewer).toContain('html lang="zh-CN"');

		// sitemap / robots / llms.txt keep pointing at the proxy
		const sitemap = await fetchWorker(new Request("http://example.com/sitemap.xml"));
		expect(await sitemap.text()).toContain("https://openanthropic.com/corsproxy");

		const robots = await fetchWorker(new Request("http://example.com/robots.txt"));
		expect(await robots.text()).toContain("Disallow: /corsproxy?url=");

		const llms = await fetchWorker(new Request("http://example.com/llms.txt"));
		expect(await llms.text()).toContain("/corsproxy?key=");
	});

	it("requires a valid API key for every proxy call", async () => {
		// SEO: hreflang alternates + FAQ structured data on the product page
		const page = await fetchWorker(new Request("http://example.com/corsproxy"));
		const pageHtml = await page.text();
		expect(pageHtml).toContain('hreflang="en" href="https://openanthropic.com/corsproxy"');
		expect(pageHtml).toContain('hreflang="zh" href="https://openanthropic.com/corsproxy?lang=zh"');
		expect(pageHtml).toContain('hreflang="x-default"');
		expect(pageHtml).toContain('"@type":"FAQPage"');
		expect(pageHtml).toContain("Do I need an account?");

		const noKey = await fetchWorker(
			new Request("http://example.com/corsproxy?url=https%3A%2F%2Fexample.com")
		);
		expect(noKey.status).toBe(401);
		expect(noKey.headers.get("www-authenticate")).toContain("Bearer");
		expect((await noKey.json()).code).toBe("errApiKeyRequired");

		const badKey = await fetchWorker(
			new Request(proxyUrl("https://example.com", "ck_not_a_real_key_0000000000000000000"))
		);
		expect(badKey.status).toBe(401);
		expect((await badKey.json()).code).toBe("errApiKeyInvalid");

		// Authorization: Bearer also works
		const key = await insertKey("k-bearer01");
		const bearer = await fetchWorker(
			new Request("http://example.com/corsproxy?url=https%3A%2F%2Fexample.com", {
				headers: { Authorization: `Bearer ${key}` },
			})
		);
		expect(bearer.status).toBe(200);
	});

	it("rejects malformed, non-http, private and self targets", async () => {
		const key = await insertKey("k-validate01");
		const cases = [
			["not-a-URL", 400],
			["ftp://example.com/file", 400],
			["http://127.0.0.1:8080/", 403],
			["http://localhost/", 403],
			["http://10.1.2.3/", 403],
			["http://192.168.1.1/", 403],
			["http://169.254.169.254/latest/meta-data/", 403],
			["http://[::1]/", 403],
			["https://openanthropic.com/", 403],
		];
		for (const [target, status] of cases) {
			const response = await fetchWorker(new Request(proxyUrl(target, key)));
			expect(response.status, target).toBe(status);
		}
	});

	it("answers preflight OPTIONS with permissive CORS headers", async () => {
		const response = await fetchWorker(
			new Request("http://example.com/corsproxy?url=https%3A%2F%2Fexample.com", {
				method: "OPTIONS",
				headers: {
					Origin: "https://myapp.example",
					"Access-Control-Request-Method": "POST",
					"Access-Control-Request-Headers": "authorization,content-type",
				},
			})
		);
		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(response.headers.get("access-control-allow-methods")).toContain("DELETE");
		expect(response.headers.get("access-control-allow-headers")).toBe("authorization,content-type");
	});

	it("proxies upstream, streams the body and rewrites CORS headers", async () => {
		const fetchMock = vi.fn(async () =>
			new Response('{"ok":true}', {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"X-Upstream": "unit-test",
					"Access-Control-Allow-Origin": "https://other.example",
					"Content-Security-Policy": "default-src 'none'",
					"Strict-Transport-Security": "max-age=99999999",
					"Set-Cookie": "evil=1; Path=/",
				},
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const key = await insertKey("k-proxy001");
		const response = await fetchWorker(
			new Request(proxyUrl("https://api.example.com/data", key), {
				headers: {
					"CF-Connecting-IP": "8.8.8.8",
					Authorization: "Bearer target-token-999",
				},
			})
		);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('{"ok":true}');
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(response.headers.get("x-upstream")).toBe("unit-test");
		expect(response.headers.get("set-cookie")).toBeNull();
		expect(response.headers.get("content-security-policy")).toBeNull();
		// upstream HSTS must not be adopted as this origin's policy
		expect(response.headers.get("strict-transport-security")).not.toContain("99999999");
		expect(response.headers.get("x-cors-proxy")).toBe("openanthropic.com");
		expect(response.headers.get("x-ratelimit-remaining")).toBe(String(CORS_RATE_PER_HOUR - 1));

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [target, init] = fetchMock.mock.calls[0];
		expect(target).toBe("https://api.example.com/data");
		// Authorization for the target API is forwarded untouched
		expect(init.headers.get("Authorization")).toBe("Bearer target-token-999");

		// ...but a Bearer proxy key (no ?key=) is consumed, never forwarded
		const bearerCall = await fetchWorker(
			new Request("http://example.com/corsproxy?url=https%3A%2F%2Fapi.example.com%2Fother", {
				headers: { Authorization: `Bearer ${key}` },
			})
		);
		expect(bearerCall.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBeNull();
	});

	it("rate limits per key and keeps keys isolated", async () => {
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const keyA = await insertKey("k-quota001");
		const keyB = await insertKey("k-quota002");

		let last;
		for (let i = 0; i < CORS_RATE_PER_HOUR; i++) {
			last = await fetchWorker(new Request(proxyUrl("https://example.com/data", keyA)));
			expect(last.status, `request ${i + 1}`).toBe(200);
		}
		expect(fetchMock).toHaveBeenCalledTimes(CORS_RATE_PER_HOUR);

		const blocked = await fetchWorker(new Request(proxyUrl("https://example.com/data", keyA)));
		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("retry-after")).toBeTruthy();
		expect((await blocked.json()).code).toBe("errRateLimited");

		// a second key still has its own quota
		const other = await fetchWorker(new Request(proxyUrl("https://example.com/data", keyB)));
		expect(other.status).toBe(200);
	});

	it("issues, rotates and revokes keys through the console API", async () => {
		const unauth = await fetchWorker(new Request("http://example.com/api/cors-key"));
		expect(unauth.status).toBe(401);

		const cookie = await registerUser("ckey");

		const first = await fetchWorker(
			new Request("http://example.com/api/cors-key", { headers: { Cookie: cookie } })
		);
		expect(first.status).toBe(200);
		const firstData = await first.json();
		expect(firstData.key).toMatch(/^ck_[0-9a-f]{40}$/);
		expect(firstData.limitHour).toBe(CORS_RATE_PER_HOUR);
		expect(firstData.usedHour).toBe(0);

		// repeat fetch returns the same key (idempotent)
		const again = await fetchWorker(
			new Request("http://example.com/api/cors-key", { headers: { Cookie: cookie } })
		);
		expect((await again.json()).key).toBe(firstData.key);

		// proxying with the key bumps the usage counter
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const proxied = await fetchWorker(
			new Request(proxyUrl("https://example.com/x", firstData.key), {
				headers: { "CF-Connecting-IP": "5.5.5.5" },
			})
		);
		expect(proxied.status).toBe(200);
		const used = await fetchWorker(
			new Request("http://example.com/api/cors-key", { headers: { Cookie: cookie } })
		);
		expect((await used.json()).usedHour).toBeGreaterThanOrEqual(1);

		// rotate: new key works, old key dies
		const rotated = await fetchWorker(
			new Request("http://example.com/api/cors-key", {
				method: "POST",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(rotated.status).toBe(200);
		const rotatedData = await rotated.json();
		expect(rotatedData.key).not.toBe(firstData.key);

		const oldKeyCall = await fetchWorker(
			new Request(proxyUrl("https://example.com/x", firstData.key))
		);
		expect(oldKeyCall.status).toBe(401);
		const newKeyCall = await fetchWorker(
			new Request(proxyUrl("https://example.com/x", rotatedData.key))
		);
		expect(newKeyCall.status).toBe(200);

		// revoke: next GET mints a fresh key
		const revoked = await fetchWorker(
			new Request("http://example.com/api/cors-key", {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(revoked.status).toBe(200);
		const deadKeyCall = await fetchWorker(
			new Request(proxyUrl("https://example.com/x", rotatedData.key))
		);
		expect(deadKeyCall.status).toBe(401);

		const fresh = await fetchWorker(
			new Request("http://example.com/api/cors-key", { headers: { Cookie: cookie } })
		);
		const freshData = await fresh.json();
		expect(freshData.key).not.toBe(rotatedData.key);
	});

	it("answers the MCP capability probes clients send after initialize", async () => {
		const call = (method, params) =>
			fetchWorker(
				new Request("http://example.com/mcp", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json, text/event-stream",
					},
					body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
				})
			);

		// advertised capabilities must answer their list methods
		for (const [method, key] of [
			["prompts/list", "prompts"],
			["resources/list", "resources"],
			["resources/templates/list", "resourceTemplates"],
		]) {
			const res = await call(method);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.error).toBeUndefined();
			expect(body.result[key]).toEqual([]);
		}

		// subscribe calls are accepted even though we push no updates
		for (const method of ["resources/subscribe", "resources/unsubscribe"]) {
			const res = await call(method, { uri: "x://y" });
			expect(res.status).toBe(200);
			expect((await res.json()).result).toEqual({});
		}

		// unknown prompts/resources are invalid params, not "method not found"
		const prompt = await call("prompts/get", { name: "nope" });
		expect((await prompt.json()).error.code).toBe(-32602);
		const resource = await call("resources/read", { uri: "nope://x" });
		expect((await resource.json()).error.code).toBe(-32602);

		// unknown methods must still answer with HTTP 200 + JSON-RPC error,
		// otherwise clients report a transport failure (404 = "session gone")
		const unknown = await call("does/not/exist");
		expect(unknown.status).toBe(200);
		const unknownBody = await unknown.json();
		expect(unknownBody.error.code).toBe(-32601);
		expect(unknownBody.id).toBe(1);

		// notifications are accepted with 202 and no body
		const notification = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
			})
		);
		expect(notification.status).toBe(202);

		const unknownNotification = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/something-else" }),
			})
		);
		expect(unknownNotification.status).toBe(202);

		// a client asking for an SSE stream on GET gets 405 instead of unrelated JSON
		const sse = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "GET",
				headers: { Accept: "text/event-stream" },
			})
		);
		expect(sse.status).toBe(405);

		// plain GET still answers with server info for discovery probes
		const info = await fetchWorker(new Request("http://example.com/mcp"));
		expect(info.status).toBe(200);
		expect((await info.json()).name).toBe("oh-my-share");
	});

	it("accepts an API key as an MCP bearer token for non-interactive clients", async () => {
		const cookie = await registerUser("mcpkey");
		const issued = await fetchWorker(
			new Request("http://example.com/api/cors-key", { headers: { Cookie: cookie } })
		);
		expect(issued.status).toBe(200);
		const { key } = await issued.json();
		expect(key).toMatch(/^ck_[0-9a-f]{40}$/);

		const call = (token) =>
			fetchWorker(
				new Request("http://example.com/mcp", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "tools/call",
						params: { name: "list_assets", arguments: {} },
					}),
				})
			);

		// authenticated tool works with the static key (no browser OAuth flow)
		const ok = await call(key);
		expect(ok.status).toBe(200);
		const okBody = await ok.json();
		expect(okBody.error).toBeUndefined();

		// no credentials -> 401
		const anon = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 2,
					method: "tools/call",
					params: { name: "list_assets", arguments: {} },
				}),
			})
		);
		expect(anon.status).toBe(401);

		// unknown / revoked key -> treated as unauthenticated
		const bogus = await call(`ck_${"0".repeat(40)}`);
		expect(bogus.status).toBe(401);

		const revoke = await fetchWorker(
			new Request("http://example.com/api/cors-key", {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(revoke.status).toBe(200);
		const revoked = await call(key);
		expect(revoked.status).toBe(401);

		// the initialize handshake advertises the static-key option
		const init = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 3,
					method: "initialize",
					params: {
						protocolVersion: "2025-06-18",
						capabilities: {},
						clientInfo: { name: "probe", version: "1" },
					},
				}),
			})
		);
		const initBody = await init.json();
		expect(initBody.result.authentication.apiKey.header).toBe("Authorization");
	});
});

describe("Community", () => {
	async function registerUser(tag) {
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ email: `${tag}-${Date.now()}@test.com`, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];
		const me = await fetchWorker(
			new Request("http://example.com/api/auth/me", { headers: { Cookie: cookie } })
		);
		const { user } = await me.json();
		return { cookie, userId: user.id };
	}

	async function publishFile(id, ownerId, title) {
		const now = Math.floor(Date.now() / 1000);
		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, published_at, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		)
			.bind(id, `${id}.html`, ownerId, now, "edt_x", now, now, title)
			.run();
	}

	it("slims the nav and adds a More tools section on the home page", async () => {
		const home = await fetchWorker(new Request("http://example.com/"));
		const html = await home.text();

		const navStart = html.indexOf("<nav");
		const navEnd = html.indexOf("</nav>");
		const navHtml = html.slice(navStart, navEnd);
		expect(navHtml).toContain('href="/community"');
		expect(navHtml).toContain('href="/mcp-guide"');
		expect(navHtml).toContain('href="/corsproxy"');
		expect(navHtml).not.toContain('href="/html-viewer"');
		expect(navHtml).not.toContain('href="/code-share"');
		expect(navHtml).not.toContain('href="/codepen-alternative"');

		// removed nav links stay reachable from the tools section + footer
		expect(html).toContain('id="tools"');
		expect(html).toContain('data-i18n="toolViewerDesc"');
		expect(html).toContain('data-i18n="toolShareDesc"');
		expect(html).toContain('data-i18n="toolCorsDesc"');
		expect(html).toContain('href="/html-viewer"');
	});

	it("shows authors, avatars and like buttons on the community feed", async () => {
		const { cookie, userId } = await registerUser("feed");
		const nick = await fetchWorker(
			new Request("http://example.com/api/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ nickname: "社区 tester", bio: "hello bio" }),
			})
		);
		expect(nick.status).toBe(200);

		await publishFile("commfeed00001", userId, "Feed work title");

		const page = await fetchWorker(new Request("http://example.com/gallery"));
		expect(page.status).toBe(200);
		const html = await page.text();
		expect(html).toContain(`/u/${userId}`);
		expect(html).toContain("社区 tester");
		expect(html).toContain('data-file="commfeed00001"');
		expect(html).toContain(`/avatar/${userId}.svg`);
		expect(html).toContain("Feed work title");
	});

	it("keeps sign-in state and language consistent across pages", async () => {
		// ?lang= is persisted site-wide via an osh_lang cookie
		const zh = await fetchWorker(new Request("http://example.com/community?lang=zh"));
		const setCookie = zh.headers.get("set-cookie") || "";
		expect(setCookie).toContain("osh_lang=zh");
		expect(await zh.text()).toContain("社区讨论");

		// the cookie keeps following pages in the same language
		const gal = await fetchWorker(
			new Request("http://example.com/gallery", { headers: { Cookie: "osh_lang=zh" } })
		);
		expect(await gal.text()).toContain("作品广场");

		// signed out -> shared sign-in slot
		const anon = await fetchWorker(new Request("http://example.com/community?lang=en"));
		expect(await anon.text()).toContain("Sign in / Register");

		// signed in -> the same account email everywhere, no fake sign-in prompt
		const { cookie, userId } = await registerUser("consist");
		for (const path of ["/community?lang=en", "/gallery?lang=en", `/u/${userId}?lang=en`]) {
			const page = await fetchWorker(
				new Request(`http://example.com${path}`, { headers: { Cookie: cookie } })
			);
			const html = await page.text();
			expect(html).not.toContain("Sign in / Register");
			expect(html).toContain("@test.com");
		}
	});

	it("serves a dedicated discussion board at /community, separate from the works gallery", async () => {
		const res = await fetchWorker(new Request("http://example.com/community"));
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("Discussions");
		expect(html).toContain('class="seg-tabs"');
		expect(html).toContain('href="/gallery"');
		expect(html).toContain('"@type":"CollectionPage"');
		expect(html).toContain('rel="canonical"');
	});

	it("toggles likes through the API", async () => {
		const { cookie } = await registerUser("liker");
		await publishFile("commlike00001", null, "Likeable");

		const unauth = await fetchWorker(
			new Request("http://example.com/api/likes", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ file_id: "commlike00001" }),
			})
		);
		expect(unauth.status).toBe(401);
		expect((await unauth.json()).code).toBe("errAuthRequired");

		const like = await fetchWorker(
			new Request("http://example.com/api/likes", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ file_id: "commlike00001" }),
			})
		);
		expect(like.status).toBe(200);
		expect(await like.json()).toEqual({ liked: true, count: 1 });

		const unlike = await fetchWorker(
			new Request("http://example.com/api/likes", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ file_id: "commlike00001" }),
			})
		);
		expect(await unlike.json()).toEqual({ liked: false, count: 0 });

		const missing = await fetchWorker(
			new Request("http://example.com/api/likes", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ file_id: "doesnotexist99" }),
			})
		);
		expect(missing.status).toBe(404);

		const invalid = await fetchWorker(
			new Request("http://example.com/api/likes", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ file_id: "bad id!" }),
			})
		);
		expect(invalid.status).toBe(400);
	});

	it("renders profiles with works, bio and an owner edit form", async () => {
		const { cookie, userId } = await registerUser("prof");
		await fetchWorker(
			new Request("http://example.com/api/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ nickname: "prof nick", bio: "profile bio line" }),
			})
		);
		await publishFile("commprof00001", userId, "Profile work");

		const profile = await fetchWorker(
			new Request(`http://example.com/u/${userId}`, { headers: { Cookie: cookie } })
		);
		expect(profile.status).toBe(200);
		const html = await profile.text();
		expect(html).toContain("prof nick");
		expect(html).toContain("profile bio line");
		expect(html).toContain('id="profileForm"');
		expect(html).toContain("Profile work");
		expect(html).toContain('"@type":"ProfilePage"');

		// another visitor sees no edit form
		const visitor = await registerUser("vist");
		const view = await fetchWorker(
			new Request(`http://example.com/u/${userId}`, { headers: { Cookie: visitor.cookie } })
		);
		expect((await view.text())).not.toContain('id="profileForm"');

		const missing = await fetchWorker(new Request("http://example.com/u/nobody-here-999?lang=en"));
		expect(missing.status).toBe(404);
		expect(await missing.text()).toContain("User not found");
	});

	it("validates profile updates and serves identicon avatars", async () => {
		const { cookie, userId } = await registerUser("avat");

		const bad = await fetchWorker(
			new Request("http://example.com/api/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ nickname: "x", bio: "" }),
			})
		);
		expect(bad.status).toBe(400);

		const avatar = await fetchWorker(new Request(`http://example.com/avatar/${userId}.svg`));
		expect(avatar.status).toBe(200);
		expect(avatar.headers.get("content-type")).toContain("image/svg+xml");
		expect(await avatar.text()).toContain("<svg");

		const badAvatar = await fetchWorker(new Request("http://example.com/avatar/nope!.svg"));
		expect(badAvatar.status).toBe(404);
	});

	it("creates discussion posts that appear in the feed and have a detail page", async () => {
		const { cookie, userId } = await registerUser("post");

		const unauth = await fetchWorker(
			new Request("http://example.com/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ content: "hello world this is a post" }),
			})
		);
		expect(unauth.status).toBe(401);

		const tooShort = await fetchWorker(
			new Request("http://example.com/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ content: "short" }),
			})
		);
		expect(tooShort.status).toBe(400);

		const created = await fetchWorker(
			new Request("http://example.com/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ title: "How do I publish?", content: "I want to share my dashboard HTML with the community." }),
			})
		);
		expect(created.status).toBe(201);
		const { id: postId } = await created.json();

		const board = await fetchWorker(
			new Request("http://example.com/community", { headers: { Cookie: cookie } })
		);
		expect(board.status).toBe(200);
		const boardHtml = await board.text();
		expect(boardHtml).toContain(`/post/${postId}`);
		expect(boardHtml).toContain("How do I publish?");
		expect(boardHtml).toContain('id="postForm"');

		// the works gallery stays works-only
		const feed = await fetchWorker(new Request("http://example.com/gallery"));
		const feedHtml = await feed.text();
		expect(feedHtml).not.toContain(`/post/${postId}`);
		expect(feedHtml).not.toContain('id="postForm"');

		const page = await fetchWorker(
			new Request(`http://example.com/post/${postId}`, { headers: { Cookie: cookie } })
		);
		expect(page.status).toBe(200);
		const html = await page.text();
		expect(html).toContain("How do I publish?");
		expect(html).toContain("I want to share my dashboard HTML");
		expect(html).toContain(`href="/u/${userId}"`);
		expect(html).toContain('"@type":"DiscussionForumPosting"');
		expect(html).toContain('id="commentForm"');

		const missing = await fetchWorker(new Request("http://example.com/post/no-such-post-99"));
		expect(missing.status).toBe(404);
	});

	it("supports threaded comments on posts and published works", async () => {
		const author = await registerUser("cmta");
		const commenter = await registerUser("cmtb");
		await publishFile("commcmt00001", author.userId, "Commentable work");

		const created = await fetchWorker(
			new Request("http://example.com/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: author.cookie },
				body: JSON.stringify({ title: "Discuss this", content: "A long enough post body for discussion purposes." }),
			})
		);
		const { id: postId } = await created.json();

		const unauth = await fetchWorker(
			new Request("http://example.com/api/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ target_type: "post", target_id: postId, content: "anon comment" }),
			})
		);
		expect(unauth.status).toBe(401);

		const c1 = await fetchWorker(
			new Request("http://example.com/api/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: commenter.cookie },
				body: JSON.stringify({ target_type: "post", target_id: postId, content: "First comment on the post" }),
			})
		);
		expect(c1.status).toBe(201);
		const { id: commentId } = await c1.json();

		const reply = await fetchWorker(
			new Request("http://example.com/api/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: author.cookie },
				body: JSON.stringify({ target_type: "post", target_id: postId, parent_id: commentId, content: "Replying to you" }),
			})
		);
		expect(reply.status).toBe(201);

		const page = await fetchWorker(new Request(`http://example.com/post/${postId}`));
		const html = await page.text();
		expect(html).toContain("First comment on the post");
		expect(html).toContain("Replying to you");
		expect(html).toContain("c-replies");
		expect(html).toContain("Comments · 2");

		// comments also work on published works
		const workComment = await fetchWorker(
			new Request("http://example.com/api/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: commenter.cookie },
				body: JSON.stringify({ target_type: "work", target_id: "commcmt00001", content: "Nice work!" }),
			})
		);
		expect(workComment.status).toBe(201);

		const workPage = await fetchWorker(
			new Request("http://example.com/gallery/commcmt00001?lang=en", {
				headers: { Cookie: commenter.cookie },
			})
		);
		const workHtml = await workPage.text();
		expect(workHtml).toContain("Nice work!");
		expect(workHtml).toContain('id="commentForm"');

		// invalid target rejected
		const badTarget = await fetchWorker(
			new Request("http://example.com/api/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: commenter.cookie },
				body: JSON.stringify({ target_type: "post", target_id: "missing-post-99", content: "nope" }),
			})
		);
		expect(badTarget.status).toBe(404);

		// owner deletes the comment, others cannot
		const foreignDelete = await fetchWorker(
			new Request(`http://example.com/api/comments/${commentId}`, {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: author.cookie },
			})
		);
		expect(foreignDelete.status).toBe(403);

		const ownDelete = await fetchWorker(
			new Request(`http://example.com/api/comments/${commentId}`, {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: commenter.cookie },
			})
		);
		expect(ownDelete.status).toBe(200);

		const after = await fetchWorker(new Request(`http://example.com/post/${postId}`));
		expect(await after.text()).not.toContain("First comment on the post");
	});

	it("lists posts on the profile page and removes them on delete", async () => {
		const { cookie, userId } = await registerUser("pdel");
		const created = await fetchWorker(
			new Request("http://example.com/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ title: "Temp post", content: "This post will be deleted in the test." }),
			})
		);
		const { id: postId } = await created.json();

		const profile = await fetchWorker(
			new Request(`http://example.com/u/${userId}`, { headers: { Cookie: cookie } })
		);
		expect(await profile.text()).toContain(`/post/${postId}`);

		const removed = await fetchWorker(
			new Request(`http://example.com/api/posts/${postId}`, {
				method: "DELETE",
				headers: { Origin: "http://example.com", Cookie: cookie },
			})
		);
		expect(removed.status).toBe(200);

		const board = await fetchWorker(new Request("http://example.com/community"));
		expect(await board.text()).not.toContain(`/post/${postId}`);

		const page = await fetchWorker(new Request(`http://example.com/post/${postId}`));
		expect(page.status).toBe(404);
	});
	it("escapes JSON-LD so user titles cannot break out of the script element", async () => {
		const payload = '</script><script>alert(document.domain)</script>';
		const html = renderDocument({
			lang: "en",
			title: "test",
			jsonLd: { "@context": "https://schema.org", "@type": "Thing", name: payload },
		});
		expect(html).not.toContain(payload);
		expect(html).toContain("\\u003c/script\\u003e");
		expect(html).toContain("\\u003cscript\\u003e");

		const multiple = renderDocument({
			lang: "en",
			title: "test",
			jsonLd: [{ name: payload }, { name: "safe" }],
		});
		expect((multiple.match(/application\/ld\+json/g) || []).length).toBe(2);
		expect(multiple).not.toContain("</script><script>");
	});

	it("escapes a malicious gallery title in the rendered JSON-LD", async () => {
		const ip = "198.51.100.10";
		const email = `xss-${Date.now()}@test.com`;
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					"CF-Connecting-IP": ip,
				},
				body: JSON.stringify({ email, password: "Passw0rd123" }),
			})
		);
		expect(register.status).toBe(201);
		const cookie = (register.headers.get("set-cookie") || "").split(";")[0];

		const payload = '</script><script>alert(1)</script>';
		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					Cookie: cookie,
					"CF-Connecting-IP": ip,
				},
				body: JSON.stringify({ code: "<h1>x</h1>", title: payload }),
			})
		);
		const { id } = await upload.json();
		await fetchWorker(
			new Request(`http://example.com/api/assets/${id}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com", Cookie: cookie },
				body: JSON.stringify({ published: true }),
			})
		);

		const detail = await fetchWorker(new Request(`http://example.com/gallery/${id}`));
		expect(detail.status).toBe(200);
		const html = await detail.text();
		expect(html).not.toContain("</script><script>");
		expect(html).toContain("\\u003c/script\\u003e");
	});

	it("completes the OAuth consent flow, enforces PKCE, and accepts the token on MCP", async () => {
		const ip = "198.51.100.11";
		const email = `oauth-${Date.now()}@test.com`;
		const password = "Passw0rd123";
		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					"CF-Connecting-IP": ip,
				},
				body: JSON.stringify({ email, password }),
			})
		);
		expect(register.status).toBe(201);
		const registerCookie = (register.headers.get("set-cookie") || "").split(";")[0];
		const sessionToken = registerCookie.slice("osh_session=".length);

		// A web session token is also a valid MCP bearer token.
		const sessionRpc = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${sessionToken}`,
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: { name: "list_assets", arguments: {} },
				}),
			})
		);
		expect(sessionRpc.status).toBe(200);
		expect((await sessionRpc.json()).result).toBeTruthy();

		const verifier = "a".repeat(64);
		const challenge = bytesToBase64Url(await sha256(verifier));
		const redirectUri = "https://client.example/callback";
		const authUrl = new URL("http://example.com/oauth/authorize");
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("client_id", "test-client");
		authUrl.searchParams.set("redirect_uri", redirectUri);
		authUrl.searchParams.set("code_challenge", challenge);
		authUrl.searchParams.set("code_challenge_method", "S256");
		authUrl.searchParams.set("state", "state-123");

		// Non-HTTPS, non-loopback redirects and plain PKCE are rejected.
		const badRedirect = new URL(authUrl);
		badRedirect.searchParams.set("redirect_uri", "myapp://callback");
		expect((await fetchWorker(new Request(badRedirect))).status).toBe(400);
		const plainPkce = new URL(authUrl);
		plainPkce.searchParams.set("code_challenge_method", "plain");
		expect((await fetchWorker(new Request(plainPkce))).status).toBe(400);

		const authorize = await fetchWorker(new Request(authUrl));
		expect(authorize.status).toBe(302);
		const loginLocation = new URL(authorize.headers.get("location"));
		const authId = loginLocation.searchParams.get("auth_id");
		expect(authId).toMatch(/^[a-f0-9]{16}$/);

		// The consent page requires a signed-in user and shows what is being granted.
		const anonConsent = await fetchWorker(
			new Request(`http://example.com/oauth/consent?auth_id=${authId}`)
		);
		expect(anonConsent.status).toBe(302);
		expect(anonConsent.headers.get("location")).toContain("/oauth/login?auth_id=");

		const login = await fetchWorker(
			new Request("http://example.com/oauth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: "http://example.com",
					"CF-Connecting-IP": ip,
				},
				body: new URLSearchParams({ auth_id: authId, email, password }).toString(),
			})
		);
		expect(login.status).toBe(302);
		expect(login.headers.get("location")).toBe(`/oauth/consent?auth_id=${authId}`);
		const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
		expect(cookie).toContain("osh_session=");

		const consent = await fetchWorker(
			new Request(`http://example.com/oauth/consent?auth_id=${authId}`, {
				headers: { Cookie: cookie },
			})
		);
		expect(consent.status).toBe(200);
		const consentHtml = await consent.text();
		expect(consentHtml).toContain("test-client");
		expect(consentHtml).toContain(redirectUri);
		expect(consentHtml).toContain('value="allow"');

		const denyOrigin = await fetchWorker(
			new Request("http://example.com/oauth/consent", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: "https://evil.example",
					Cookie: cookie,
				},
				body: new URLSearchParams({ auth_id: authId, decision: "allow" }).toString(),
			})
		);
		expect(denyOrigin.status).toBe(403);

		const allow = await fetchWorker(
			new Request("http://example.com/oauth/consent", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: "http://example.com",
					Cookie: cookie,
				},
				body: new URLSearchParams({ auth_id: authId, decision: "allow" }).toString(),
			})
		);
		expect(allow.status).toBe(302);
		const callback = new URL(allow.headers.get("location"));
		expect(callback.origin).toBe("https://client.example");
		expect(callback.searchParams.get("state")).toBe("state-123");
		const code = callback.searchParams.get("code");
		expect(code).toBeTruthy();

		const tokenBody = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: "test-client",
			code_verifier: "b".repeat(64),
		});
		const badToken = await fetchWorker(
			new Request("http://example.com/oauth/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: tokenBody.toString(),
			})
		);
		expect(badToken.status).toBe(400);
		expect((await badToken.json()).error).toBe("invalid_grant");

		tokenBody.set("code_verifier", verifier);
		const token = await fetchWorker(
			new Request("http://example.com/oauth/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: tokenBody.toString(),
			})
		);
		expect(token.status).toBe(200);
		const accessToken = (await token.json()).access_token;
		expect(accessToken).toBeTruthy();

		const rpc = await fetchWorker(
			new Request("http://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 2,
					method: "tools/call",
					params: { name: "list_assets", arguments: {} },
				}),
			})
		);
		expect(rpc.status).toBe(200);
		const rpcBody = await rpc.json();
		expect(rpcBody.error).toBeUndefined();
		expect(rpcBody.result).toBeTruthy();
	});

	it("rate-limits password attempts and upgrades legacy page password hashes", async () => {
		const upload = await fetchWorker(
			new Request("http://example.com/api/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: "http://example.com" },
				body: JSON.stringify({ code: "<h1>secret</h1>", password: "CorrectHorse1" }),
			})
		);
		expect(upload.status).toBe(200);
		const { id } = await upload.json();

		const row = await env.DB.prepare("SELECT password_hash FROM files WHERE id = ?").bind(id).first();
		expect(row.password_hash).toMatch(/^pbkdf2-sha256\$/);

		const verify = (password, ip) =>
			fetchWorker(
				new Request(`http://example.com/api/verify-password/${id}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"CF-Connecting-IP": ip,
					},
					body: new URLSearchParams({ password }).toString(),
				})
			);

		const correct = await verify("CorrectHorse1", "198.51.100.30");
		expect(correct.status).toBe(302);
		const cookie = correct.headers.get("set-cookie") || "";
		expect(cookie).toContain(`osh_pwd_${id}=`);
		expect(cookie).not.toContain(row.password_hash);

		let last = null;
		for (let i = 0; i < 11; i += 1) {
			last = await verify("wrong-password", "198.51.100.31");
		}
		expect(last.status).toBe(429);

		// Legacy unsalted SHA-256 rows still work once, then get upgraded.
		const now = Math.floor(Date.now() / 1000);
		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)"
		)
			.bind("legacypwd01", "legacypwd01.html", null, now, "edt_legacy", now, await hashPassword("LegacyPass1"))
			.run();
		const legacy = await fetchWorker(
			new Request("http://example.com/api/verify-password/legacypwd01", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"CF-Connecting-IP": "198.51.100.32",
				},
				body: new URLSearchParams({ password: "LegacyPass1" }).toString(),
			})
		);
		expect(legacy.status).toBe(302);
		const upgraded = await env.DB.prepare(
			"SELECT password_hash FROM files WHERE id = ?"
		).bind("legacypwd01").first();
		expect(upgraded.password_hash).toMatch(/^pbkdf2-sha256\$/);
	});

	it("lets admins review, hide and restore reported works", async () => {
		const now = Math.floor(Date.now() / 1000);
		const adminEnv = new Proxy(env, {
			get(target, prop) {
				if (prop === "ADMIN_EMAILS") return "mod@openanthropic.com";
				return Reflect.get(target, prop);
			},
		});

		const register = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					"CF-Connecting-IP": "198.51.100.40",
				},
				body: JSON.stringify({ email: "mod@openanthropic.com", password: "Passw0rd123" }),
			}),
			adminEnv
		);
		expect(register.status).toBe(201);
		const adminCookie = (register.headers.get("set-cookie") || "").split(";")[0];

		const outsiderRegister = await fetchWorker(
			new Request("http://example.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "http://example.com",
					"CF-Connecting-IP": "198.51.100.41",
				},
				body: JSON.stringify({ email: "outsider@example.org", password: "Passw0rd123" }),
			})
		);
		const outsiderCookie = (outsiderRegister.headers.get("set-cookie") || "").split(";")[0];

		await env.DB.prepare(
			"INSERT INTO files (id, filename, owner_id, created_at, edit_token, updated_at, published_at, report_count, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
		)
			.bind("reported0001", "reported0001.html", null, now, "edt_reported", now, now, 3, now)
			.run();
		for (const [index, reporter] of ["r1", "r2", "r3"].entries()) {
			await env.DB.prepare(
				"INSERT INTO reports (file_id, reason, details, reporter_hash, created_at) VALUES (?, ?, ?, ?, ?)"
			)
				.bind("reported0001", "other", "", reporter, now + index)
				.run();
		}

		const admin = await fetchWorker(
			new Request("http://example.com/admin", { headers: { Cookie: adminCookie } }),
			adminEnv
		);
		expect(admin.status).toBe(200);
		expect(await admin.text()).toContain("reported0001");

		const action = (cookie, origin, value) =>
			fetchWorker(
				new Request("http://example.com/api/admin/reports", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Origin: origin,
						Cookie: cookie,
					},
					body: new URLSearchParams({ id: "reported0001", action: value }).toString(),
				}),
				adminEnv
			);

		const crossOrigin = await action(adminCookie, "https://evil.example", "restore");
		expect(crossOrigin.status).toBe(403);

		const outsider = await action(outsiderCookie, "http://example.com", "restore");
		expect(outsider.status).toBe(404);

		const restored = await action(adminCookie, "http://example.com", "restore");
		expect(restored.status).toBe(303);
		const afterRestore = await env.DB.prepare(
			"SELECT report_count, reported_at FROM files WHERE id = ?"
		).bind("reported0001").first();
		expect(afterRestore.report_count).toBe(0);
		expect(afterRestore.reported_at).toBeNull();
		const reportsLeft = await env.DB.prepare(
			"SELECT COUNT(*) AS n FROM reports WHERE file_id = ?"
		).bind("reported0001").first();
		expect(reportsLeft.n).toBe(0);

		const hidden = await action(adminCookie, "http://example.com", "hide");
		expect(hidden.status).toBe(303);
		const afterHide = await env.DB.prepare(
			"SELECT reported_at FROM files WHERE id = ?"
		).bind("reported0001").first();
		expect(afterHide.reported_at).toBeGreaterThan(0);
	});

});
