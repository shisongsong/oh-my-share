import {
	createExecutionContext,
	env,
	SELF,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src";
import { handleUpload } from "../src/handlers/upload.js";
import { detectLang } from "../src/i18n.js";
import { validateSlug } from "../src/security.js";

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

	it("returns a 404 for unknown routes", async () => {
		const response = await SELF.fetch("http://example.com/unknown");

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not Found");
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
});
