//#region src/ui/modules/state.js
function e() {
	if (typeof window > "u") return "zh";
	let e = new URLSearchParams(window.location.search).get("lang");
	if (e === "zh" || e === "en") return e;
	try {
		let e = window.localStorage.getItem("osh_lang");
		if (e === "zh" || e === "en") return e;
	} catch {}
	return window.CURRENT_LANG === "zh" || window.CURRENT_LANG === "en" ? window.CURRENT_LANG : "zh";
}
var t = {
	user: null,
	canEncrypt: !1,
	lang: e(),
	authMode: "login"
}, n = JSON.parse(document.getElementById("i18n-data").textContent);
function r(e) {
	return n[t.lang]?.[e] || n.en?.[e] || e;
}
function i(e) {
	t.lang = e;
	let r = n[e];
	if (!r) return;
	try {
		window.localStorage.setItem("osh_lang", e);
	} catch {}
	try {
		document.cookie = `osh_lang=${e}; path=/; max-age=31536000; SameSite=Lax`;
	} catch {}
	document.documentElement.lang = r.htmlLang, document.title = "Oh My Share - " + r.subtitle;
	let i = document.querySelectorAll("[data-i18n]");
	for (let e = 0; e < i.length; e++) {
		let t = i[e], n = r[t.getAttribute("data-i18n")];
		if (n !== void 0) {
			if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") t.placeholder = n;
			else if (t.dataset.loading === "true") continue;
			else t.textContent = n;
		}
	}
	let a = document.getElementById("langBtnText");
	a && (a.textContent = e === "zh" ? "EN" : "中文"), window.updatePricingDisplay && window.updatePricingDisplay(e);
}
function a() {
	i(t.lang === "zh" ? "en" : "zh");
}
//#endregion
//#region src/ui/modules/api.js
async function o(e, t = {}) {
	let n = await fetch(e, t), i = await n.text(), a;
	try {
		a = JSON.parse(i);
	} catch {
		a = { error: i };
	}
	if (!n.ok) {
		let e = a.code && r(a.code) !== a.code ? r(a.code) : null;
		throw Error(e || a.error || r("authError"));
	}
	return a;
}
function s(e) {
	return o(e, { headers: { Accept: "application/json" } });
}
function c(e, t) {
	return o(e, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(t)
	});
}
function l(e, t) {
	return o(e, {
		method: "POST",
		body: t
	});
}
function u(e) {
	return o(e, { method: "DELETE" });
}
//#endregion
//#region src/ui/modules/assets.js
async function d() {
	if (!t.user) return;
	let e = document.getElementById("assetList");
	e.replaceChildren();
	try {
		let t = await s("/api/assets");
		if (!t.assets.length) {
			let t = document.createElement("div");
			t.className = "asset-empty", t.textContent = r("assetsEmpty"), e.appendChild(t);
			return;
		}
		t.assets.forEach((t) => {
			let n = document.createElement("div");
			n.className = "asset-row";
			let i = document.createElement("div");
			i.style.cssText = "flex:1;min-width:0";
			let a = document.createElement("a");
			if (a.href = t.url, a.target = "_blank", a.rel = "noopener noreferrer", a.textContent = t.title || t.filename || t.id, a.className = "asset-title", i.appendChild(a), t.published) {
				let e = document.createElement("span");
				e.className = "asset-badge", e.textContent = r("publishedBadge"), i.appendChild(e);
			}
			if (t.tags) {
				let e = document.createElement("div");
				e.className = "asset-tags", t.tags.split(",").forEach((t) => {
					if (t = t.trim(), t) {
						let n = document.createElement("span");
						n.className = "asset-tag", n.textContent = t, e.appendChild(n);
					}
				}), i.appendChild(e);
			}
			let o = document.createElement("small");
			o.textContent = t.encrypted ? "AES-GCM" : "HTML";
			let s = document.createElement("div");
			s.className = "asset-actions";
			let c = document.createElement("a");
			c.href = t.editToken ? `/manage/${t.id}?token=${t.editToken}` : `/view/${t.id}`, c.target = "_blank", c.className = "asset-manage", c.textContent = r("manageBtn"), s.appendChild(c);
			let l = document.createElement("button");
			l.className = "asset-publish", l.type = "button", l.textContent = t.published ? r("unpublishBtn") : r("publishBtn");
			let u = t.expiresAt && t.expiresAt * 1e3 <= Date.now(), d = t.encrypted || t.passwordProtected || u;
			!t.published && d && (l.disabled = !0, l.title = r("errCannotPublish")), l.addEventListener("click", () => p(t)), s.appendChild(l);
			let m = document.createElement("button");
			m.className = "asset-delete", m.type = "button", m.textContent = r("deleteAsset"), m.addEventListener("click", () => f(t.id)), s.appendChild(m), n.appendChild(i), n.appendChild(o), n.appendChild(s), e.appendChild(n);
		});
	} catch (t) {
		let n = document.createElement("div");
		n.className = "asset-empty", n.textContent = t.message || r("authError"), e.appendChild(n);
	}
}
async function f(e) {
	if (window.confirm(r("deleteConfirm"))) try {
		await u("/api/assets/" + encodeURIComponent(e)), d();
	} catch (e) {
		window.alert(e.message || r("authError"));
	}
}
async function p(e) {
	try {
		await c("/api/assets/" + encodeURIComponent(e.id) + "/publish", { published: !e.published }), d();
	} catch (e) {
		window.alert(e.message || r("authError"));
	}
}
//#endregion
//#region src/ui/modules/auth.js
async function m() {
	try {
		let e = await s("/api/auth/me");
		t.user = e.user, t.canEncrypt = e.canEncrypt === !0;
	} catch {
		t.user = null, t.canEncrypt = !1;
	}
	h();
}
function h() {
	let e = document.getElementById("accountBtn"), n = document.getElementById("authView"), i = document.getElementById("accountView");
	t.user ? (e.textContent = t.user.email, n.hidden = !0, i.hidden = !1, document.getElementById("accountEmail").textContent = t.user.email, d()) : (e.textContent = r("accountBtn"), n.hidden = !1, i.hidden = !0), g(), window.updateUpgradeVisibility && window.updateUpgradeVisibility(t.canEncrypt);
}
function g() {
	let e = document.getElementById("encryptToggle"), n = document.getElementById("encryptStatus"), i = document.getElementById("encryptDetails"), a = document.getElementById("passphraseInput");
	e.disabled = !t.canEncrypt, n.textContent = t.user ? t.canEncrypt ? r("encryptReady") : r("encryptPaidRequired") : r("encryptSignIn"), t.canEncrypt || (e.checked = !1), i.hidden = !e.checked, a.hidden = !e.checked || document.getElementById("keyMode").value !== "passphrase";
}
function _() {
	let e = t.authMode === "register";
	document.getElementById("authModeTitle").textContent = r(e ? "registerTitle" : "loginTitle"), document.getElementById("authSubmit").textContent = r(e ? "registerSubmit" : "loginSubmit"), document.getElementById("authModeSwitch").textContent = r(e ? "switchToLogin" : "switchToRegister"), document.getElementById("authPassword").autocomplete = e ? "new-password" : "current-password";
}
async function v(e) {
	e.preventDefault();
	let n = document.getElementById("authSubmit"), i = document.getElementById("authMessage");
	n.disabled = !0, i.textContent = "";
	try {
		t.user = (await c("/api/auth/" + t.authMode, {
			email: document.getElementById("authEmail").value,
			password: document.getElementById("authPassword").value
		})).user, t.canEncrypt = !1, await m(), document.getElementById("authPassword").value = "";
	} catch (e) {
		i.textContent = e.message || r("authError");
	} finally {
		n.disabled = !1;
	}
}
async function y() {
	await fetch("/api/auth/logout", { method: "POST" }), t.user = null, t.canEncrypt = !1, h();
}
function b() {
	document.getElementById("accountModal").classList.add("active"), t.user && d();
}
function x() {
	document.getElementById("accountModal").classList.remove("active"), document.getElementById("authMessage").textContent = "";
}
function S() {
	document.getElementById("accountBtn").addEventListener("click", b), document.getElementById("accountClose").addEventListener("click", x), document.getElementById("authForm").addEventListener("submit", v), document.getElementById("authModeSwitch").addEventListener("click", () => {
		t.authMode = t.authMode === "login" ? "register" : "login", _(), document.getElementById("authMessage").textContent = "";
	}), document.getElementById("logoutBtn").addEventListener("click", y), document.getElementById("encryptToggle").addEventListener("change", g), document.getElementById("keyMode").addEventListener("change", g), document.getElementById("accountModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && x();
	}), _(), m();
}
//#endregion
//#region src/ui/modules/upload.js
function C(e) {
	let t = e instanceof Uint8Array ? e : new Uint8Array(e), n = "";
	for (let e = 0; e < t.length; e++) n += String.fromCharCode(t[e]);
	return btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function w(e, t) {
	let n = new Uint8Array(await e.arrayBuffer()), i = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12)), a, o, s = {
		version: 1,
		algorithm: "AES-GCM",
		keyMode: t,
		iv: C(i)
	};
	if (t === "random") a = await crypto.subtle.generateKey({
		name: "AES-GCM",
		length: 256
	}, !0, ["encrypt"]), o = C(await crypto.subtle.exportKey("raw", a));
	else {
		let e = document.getElementById("passphraseInput").value;
		if (!e) throw Error(r("keyRequired"));
		let t = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16)), n = await crypto.subtle.importKey("raw", new TextEncoder().encode(e), "PBKDF2", !1, ["deriveKey"]), i = 21e4;
		a = await crypto.subtle.deriveKey({
			name: "PBKDF2",
			salt: t,
			iterations: i,
			hash: "SHA-256"
		}, n, {
			name: "AES-GCM",
			length: 256
		}, !1, ["encrypt"]), s.salt = C(t), s.iterations = i, o = C(new TextEncoder().encode(e));
	}
	let c = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: i
	}, a, n);
	return {
		blob: new Blob([c], { type: "application/octet-stream" }),
		metadata: s,
		keyFragment: "#key=" + o
	};
}
async function T(e, t, n, r) {
	if (document.getElementById("encryptToggle").checked && (!window.crypto || !window.crypto.subtle)) throw Error("Encryption requires a secure context (HTTPS)");
	let i = new FormData();
	i.append("slug", r);
	let a = document.getElementById("metaTitle").value.trim(), o = document.getElementById("metaDescription").value.trim(), s = document.getElementById("metaTags").value.trim();
	a && i.append("title", a), o && i.append("description", o), s && i.append("tags", s);
	let c = document.getElementById("sharePassword").value, l = document.getElementById("expirySelect").value;
	c && i.append("password", c), l && l !== "0" && i.append("expiresIn", l);
	let u = document.getElementById("publishToGallery");
	u && u.checked && i.append("published", "1");
	let d = document.getElementById("remixedFrom");
	if (d && d.value && i.append("remixedFrom", d.value), !document.getElementById("encryptToggle").checked) return e === "code" ? i.append("code", t) : i.append("file", t, n), {
		formData: i,
		keyFragment: ""
	};
	let f = await w(e === "code" ? new Blob([t], { type: "text/html" }) : t, document.getElementById("keyMode").value);
	return i.append("encrypted", "1"), i.append("encryption_metadata", JSON.stringify(f.metadata)), i.append("file", f.blob, n || "encrypted.html"), {
		formData: i,
		keyFragment: f.keyFragment
	};
}
async function E(e, t) {
	let n = t.innerHTML;
	t.innerHTML = "<div class=\"spinner\"></div> " + r("btnGenerating"), t.disabled = !0, t.dataset.loading = "true";
	let i = document.getElementById("resultBox"), a = document.getElementById("resultUrl");
	try {
		let t = await e(), n = await l("/api/upload", t.formData);
		i.hidden = !1, i.className = "result-box", a.value = n.url + (t.keyFragment || "");
	} catch (e) {
		i.hidden = !1, i.className = "result-box error", a.value = "❌ " + e.message;
	} finally {
		t.innerHTML = n, t.disabled = !1, t.dataset.loading = "false";
	}
}
function D(e) {
	let t = document.getElementById("dropZone"), n = t.querySelector("p");
	n.innerHTML = "<span>" + r("selectedPrefix") + "</span><span class=\"link\"></span>", n.querySelector(".link").textContent = e, t.querySelector("svg").style.color = "var(--text-main)";
}
function O() {
	let e = document.getElementById("fileInput"), t = document.getElementById("dropZone");
	t.addEventListener("click", () => e.click()), t.addEventListener("dragover", (e) => {
		e.preventDefault(), t.classList.add("dragover");
	}), t.addEventListener("dragleave", () => t.classList.remove("dragover")), t.addEventListener("drop", (n) => {
		n.preventDefault(), t.classList.remove("dragover"), n.dataTransfer.files.length && (e.files = n.dataTransfer.files, D(n.dataTransfer.files[0].name));
	}), e.addEventListener("change", () => {
		e.files.length && D(e.files[0].name);
	}), document.getElementById("btn-file").addEventListener("click", function() {
		let t = document.getElementById("panel-code"), n = document.getElementById("slug-file").value;
		if (t && t.classList.contains("active")) {
			let e = document.getElementById("codeInput").value.trim();
			if (!e) {
				alert(r("errEmptyCode"));
				return;
			}
			E(() => T("code", e, "pasted-code.html", n), this);
			return;
		}
		if (!e.files.length) {
			alert(r("errEmptyFile"));
			return;
		}
		let i = e.files[0];
		E(() => T("file", i, i.name, n), this);
	});
}
//#endregion
//#region src/ui/modules/ui.js
function k() {
	let e = document.querySelectorAll(".upload-tab"), t = document.querySelectorAll(".upload-panel");
	e.forEach((n) => {
		n.addEventListener("click", () => {
			e.forEach((e) => e.classList.remove("active")), t.forEach((e) => e.classList.remove("active")), n.classList.add("active"), document.getElementById(n.dataset.target).classList.add("active");
			let i = n.dataset.target === "panel-code", a = document.getElementById("slug-file");
			if (a) {
				let e = i ? "slugPlaceholderCode" : "slugPlaceholderFile";
				a.dataset.i18n = e, a.placeholder = r(e);
			}
			let o = document.getElementById("resultBox");
			o && (o.hidden = !0);
		});
	});
}
function A() {
	document.getElementById("copyBtn").addEventListener("click", function() {
		let e = document.getElementById("resultUrl");
		e.value && navigator.clipboard.writeText(e.value).then(() => {
			this.textContent = r("copiedBtn"), this.classList.add("copied"), setTimeout(() => {
				this.textContent = r("copyBtn"), this.classList.remove("copied");
			}, 2e3);
		}).catch(() => {
			alert(r("errCopy"));
		});
	});
}
function j() {
	let e = document.getElementById("upgradeBtn"), t = document.getElementById("upgradeModal"), n = document.getElementById("upgradeSendBtn"), i = document.getElementById("upgradeSection");
	e && e.addEventListener("click", () => {
		t.classList.add("active");
	}), n && n.addEventListener("click", () => {
		let e = encodeURIComponent(r("upgradeEmailSubject")), t = encodeURIComponent(r("upgradeEmailBody"));
		window.location.href = `mailto:1400875096@qq.com?subject=${e}&body=${t}`;
	}), window.closeUpgradeModal = function() {
		t.classList.remove("active");
	}, window.updateUpgradeVisibility = function(e) {
		i && (i.style.display = e ? "none" : "block");
	}, window.updatePricingDisplay = function(e) {
		let t = document.getElementById("pricingMain"), n = document.getElementById("pricingAlt");
		t && n && (e === "zh" ? (t.textContent = "¥9.9/月", n.textContent = "$1.9/月") : (t.textContent = "$1.9/月", n.textContent = "¥9.9/月"));
	};
}
//#endregion
//#region src/ui/modules/share.js
function M(e, t, n, r, i, a) {
	e.beginPath(), e.moveTo(t + a, n), e.arcTo(t + r, n, t + r, n + i, a), e.arcTo(t + r, n + i, t, n + i, a), e.arcTo(t, n + i, t, n, a), e.arcTo(t, n, t + r, n, a), e.closePath();
}
function N(e) {
	if (typeof qrcode > "u") {
		alert(r("imgFail"));
		return;
	}
	let t = qrcode(0, "M");
	t.addData(e), t.make();
	let n = new Image();
	n.onload = () => {
		let t = document.getElementById("shareCanvas");
		t.width = 1280, t.height = 1800, t.style.width = "100%", t.style.maxWidth = "380px";
		let i = t.getContext("2d");
		i.scale(2, 2), i.fillStyle = "#fff", i.fillRect(0, 0, 640, 900);
		let a = i.createLinearGradient(0, 0, 640, 0);
		a.addColorStop(0, "#6366f1"), a.addColorStop(1, "#8b5cf6"), i.fillStyle = a, i.fillRect(0, 0, 640, 8), i.fillStyle = "#171717", i.font = "bold 36px -apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif", i.textAlign = "center", i.textBaseline = "middle", i.fillText("Oh My Share", 320, 90), i.fillStyle = "#666", i.font = "16px -apple-system,BlinkMacSystemFont,\"PingFang SC\",sans-serif", i.fillText(r("subtitle"), 320, 130), i.fillStyle = "#f8fafc", M(i, 120, 180, 400, 400, 16), i.fill(), i.drawImage(n, 140, 200, 360, 360), i.fillStyle = "#171717", i.font = "bold 20px -apple-system,sans-serif", i.fillText(r("imageHint"), 320, 640), i.fillStyle = "#94a3b8", i.font = "14px ui-monospace,monospace";
		let o = e.length > 55 ? e.slice(0, 52) + "..." : e;
		i.fillText(o, 320, 680), i.strokeStyle = "#e5e5e5", i.lineWidth = 1, i.beginPath(), i.moveTo(80, 800), i.lineTo(560, 800), i.stroke(), i.fillStyle = "#cbd5e1", i.font = "13px -apple-system,sans-serif", i.fillText("Powered by Cloudflare Workers", 320, 840), document.getElementById("imageModal").classList.add("active");
	}, n.onerror = () => alert(r("imgFail")), n.src = t.createDataURL(8, 0);
}
function P() {
	let e = document.getElementById("shareCanvas");
	e.width && e.toBlob((e) => {
		let t = document.createElement("a");
		t.download = "oh-my-share.png", t.href = URL.createObjectURL(e), t.click(), setTimeout(() => URL.revokeObjectURL(t.href), 1e3);
	}, "image/png");
}
function F() {
	document.getElementById("imageModal").classList.remove("active");
}
function I() {
	document.getElementById("imgBtn").addEventListener("click", () => {
		let e = document.getElementById("resultUrl");
		e.value && N(e.value);
	}), document.getElementById("downloadBtn").addEventListener("click", P), document.getElementById("imageModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && F();
	}), document.addEventListener("keydown", (e) => {
		e.key === "Escape" && F();
	});
}
//#endregion
//#region src/ui/modules/webmcp.js
function L() {
	if (!navigator.modelContext) return;
	let e = new AbortController(), { signal: t } = e;
	return navigator.modelContext.registerTool({
		name: "upload_content",
		description: "Upload HTML files and code snippets for sharing",
		inputSchema: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: "HTML or code content to upload"
				},
				language: {
					type: "string",
					description: "Language type (html, css, js, json, etc.)"
				},
				filename: {
					type: "string",
					description: "Filename for the content"
				},
				password: {
					type: "string",
					description: "Optional password protection"
				},
				expiresIn: {
					type: "string",
					description: "Expiration time (1h, 24h, 7d, 30d, 90d)"
				}
			},
			required: ["content"]
		},
		execute: async (e) => await (await fetch("/api/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(e)
		})).json(),
		signal: t
	}), navigator.modelContext.registerTool({
		name: "list_assets",
		description: "List all uploaded assets for the current user",
		inputSchema: {
			type: "object",
			properties: {}
		},
		execute: async () => await (await fetch("/api/assets")).json(),
		signal: t
	}), navigator.modelContext.registerTool({
		name: "view_content",
		description: "View shared HTML content by ID",
		inputSchema: {
			type: "object",
			properties: { id: {
				type: "string",
				description: "Asset ID to view"
			} },
			required: ["id"]
		},
		execute: async (e) => await (await fetch(`/api/content/${e.id}`)).json(),
		signal: t
	}), navigator.modelContext.registerTool({
		name: "delete_asset",
		description: "Delete an uploaded asset",
		inputSchema: {
			type: "object",
			properties: { id: {
				type: "string",
				description: "Asset ID to delete"
			} },
			required: ["id"]
		},
		execute: async (e) => await (await fetch(`/api/assets/${e.id}`, { method: "DELETE" })).json(),
		signal: t
	}), navigator.modelContext.registerTool({
		name: "get_service_info",
		description: "Get information about the Oh My Share service",
		inputSchema: {
			type: "object",
			properties: {}
		},
		execute: async () => ({
			name: "Oh My Share",
			description: "HTML and code sharing with end-to-end encryption",
			endpoints: {
				upload: "/api/upload",
				assets: "/api/assets",
				view: "/view/{id}",
				auth: "/api/auth/login"
			},
			features: [
				"password protection",
				"expiration",
				"edit tokens",
				"encrypted sharing"
			]
		}),
		signal: t
	}), () => e.abort();
}
window.toggleLang = a, i(t.lang), S(), O(), k(), A(), j(), I(), L(), window.updatePricingDisplay && window.updatePricingDisplay(t.lang), window.location.search.includes("oauth_success") && window.history.replaceState({}, "", window.location.pathname);
//#endregion
