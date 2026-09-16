//#region src/ui/modules/state.js
var e = {
	user: null,
	canEncrypt: !1,
	lang: "zh",
	authMode: "login"
}, t = JSON.parse(document.getElementById("i18n-data").textContent);
function n(n) {
	return t[e.lang]?.[n] || t.en?.[n] || n;
}
function r(n) {
	e.lang = n;
	let r = t[n];
	if (!r) return;
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
	a && (a.textContent = n === "zh" ? "EN" : "中文"), window.updatePricingDisplay && window.updatePricingDisplay(n);
}
function i() {
	r(e.lang === "zh" ? "en" : "zh");
}
//#endregion
//#region src/ui/modules/api.js
async function a(e, t = {}) {
	let r = await fetch(e, t), i = await r.text(), a;
	try {
		a = JSON.parse(i);
	} catch {
		a = { error: i };
	}
	if (!r.ok) throw Error(a.error || n("authError"));
	return a;
}
function o(e) {
	return a(e, { headers: { Accept: "application/json" } });
}
function s(e, t) {
	return a(e, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(t)
	});
}
function c(e, t) {
	return a(e, {
		method: "POST",
		body: t
	});
}
function l(e) {
	return a(e, { method: "DELETE" });
}
//#endregion
//#region src/ui/modules/assets.js
async function u() {
	if (!e.user) return;
	let t = document.getElementById("assetList");
	t.replaceChildren();
	try {
		let e = await o("/api/assets");
		if (!e.assets.length) {
			let e = document.createElement("div");
			e.className = "asset-empty", e.textContent = n("assetsEmpty"), t.appendChild(e);
			return;
		}
		e.assets.forEach((e) => {
			let r = document.createElement("div");
			r.className = "asset-row";
			let i = document.createElement("div");
			i.style.cssText = "flex:1;min-width:0";
			let a = document.createElement("a");
			if (a.href = e.url, a.target = "_blank", a.rel = "noopener noreferrer", a.textContent = e.title || e.filename || e.id, a.className = "asset-title", i.appendChild(a), e.tags) {
				let t = document.createElement("div");
				t.className = "asset-tags", e.tags.split(",").forEach((e) => {
					if (e = e.trim(), e) {
						let n = document.createElement("span");
						n.className = "asset-tag", n.textContent = e, t.appendChild(n);
					}
				}), i.appendChild(t);
			}
			let o = document.createElement("small");
			o.textContent = e.encrypted ? "AES-GCM" : "HTML";
			let s = document.createElement("div");
			s.className = "asset-actions";
			let c = document.createElement("a");
			c.href = e.editToken ? `/manage/${e.id}?token=${e.editToken}` : `/view/${e.id}`, c.target = "_blank", c.className = "asset-manage", c.textContent = n("manageBtn"), s.appendChild(c);
			let l = document.createElement("button");
			l.className = "asset-delete", l.type = "button", l.textContent = n("deleteAsset"), l.addEventListener("click", () => d(e.id)), s.appendChild(l), r.appendChild(i), r.appendChild(o), r.appendChild(s), t.appendChild(r);
		});
	} catch (e) {
		let r = document.createElement("div");
		r.className = "asset-empty", r.textContent = e.message || n("authError"), t.appendChild(r);
	}
}
async function d(e) {
	if (window.confirm(n("deleteConfirm"))) try {
		await l("/api/assets/" + encodeURIComponent(e)), u();
	} catch (e) {
		window.alert(e.message || n("authError"));
	}
}
//#endregion
//#region src/ui/modules/auth.js
async function f() {
	try {
		let t = await o("/api/auth/me");
		e.user = t.user, e.canEncrypt = t.canEncrypt === !0;
	} catch {
		e.user = null, e.canEncrypt = !1;
	}
	p();
}
function p() {
	let t = document.getElementById("accountBtn"), r = document.getElementById("authView"), i = document.getElementById("accountView");
	e.user ? (t.textContent = e.user.email, r.hidden = !0, i.hidden = !1, document.getElementById("accountEmail").textContent = e.user.email, u()) : (t.textContent = n("accountBtn"), r.hidden = !1, i.hidden = !0), m(), window.updateUpgradeVisibility && window.updateUpgradeVisibility(e.canEncrypt);
}
function m() {
	let t = document.getElementById("encryptToggle"), r = document.getElementById("encryptStatus"), i = document.getElementById("encryptDetails"), a = document.getElementById("passphraseInput");
	t.disabled = !e.canEncrypt, r.textContent = e.user ? e.canEncrypt ? n("encryptReady") : n("encryptPaidRequired") : n("encryptSignIn"), e.canEncrypt || (t.checked = !1), i.hidden = !t.checked, a.hidden = !t.checked || document.getElementById("keyMode").value !== "passphrase";
}
function h() {
	let t = e.authMode === "register";
	document.getElementById("authModeTitle").textContent = n(t ? "registerTitle" : "loginTitle"), document.getElementById("authSubmit").textContent = n(t ? "registerSubmit" : "loginSubmit"), document.getElementById("authModeSwitch").textContent = n(t ? "switchToLogin" : "switchToRegister"), document.getElementById("authPassword").autocomplete = t ? "new-password" : "current-password";
}
async function g(t) {
	t.preventDefault();
	let r = document.getElementById("authSubmit"), i = document.getElementById("authMessage");
	r.disabled = !0, i.textContent = "";
	try {
		e.user = (await s("/api/auth/" + e.authMode, {
			email: document.getElementById("authEmail").value,
			password: document.getElementById("authPassword").value
		})).user, e.canEncrypt = !1, await f(), document.getElementById("authPassword").value = "";
	} catch (e) {
		i.textContent = e.message || n("authError");
	} finally {
		r.disabled = !1;
	}
}
async function _() {
	await fetch("/api/auth/logout", { method: "POST" }), e.user = null, e.canEncrypt = !1, p();
}
function v() {
	document.getElementById("accountModal").classList.add("active"), e.user && u();
}
function y() {
	document.getElementById("accountModal").classList.remove("active"), document.getElementById("authMessage").textContent = "";
}
function b() {
	document.getElementById("accountBtn").addEventListener("click", v), document.getElementById("accountClose").addEventListener("click", y), document.getElementById("authForm").addEventListener("submit", g), document.getElementById("authModeSwitch").addEventListener("click", () => {
		e.authMode = e.authMode === "login" ? "register" : "login", h(), document.getElementById("authMessage").textContent = "";
	}), document.getElementById("logoutBtn").addEventListener("click", _), document.getElementById("encryptToggle").addEventListener("change", m), document.getElementById("keyMode").addEventListener("change", m), document.getElementById("accountModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && y();
	}), h(), f();
}
//#endregion
//#region src/ui/modules/upload.js
function x(e) {
	let t = e instanceof Uint8Array ? e : new Uint8Array(e), n = "";
	for (let e = 0; e < t.length; e++) n += String.fromCharCode(t[e]);
	return btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function S(e, t) {
	let r = new Uint8Array(await e.arrayBuffer()), i = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12)), a, o, s = {
		version: 1,
		algorithm: "AES-GCM",
		keyMode: t,
		iv: x(i)
	};
	if (t === "random") a = await crypto.subtle.generateKey({
		name: "AES-GCM",
		length: 256
	}, !0, ["encrypt"]), o = x(await crypto.subtle.exportKey("raw", a));
	else {
		let e = document.getElementById("passphraseInput").value;
		if (!e) throw Error(n("keyRequired"));
		let t = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16)), r = await crypto.subtle.importKey("raw", new TextEncoder().encode(e), "PBKDF2", !1, ["deriveKey"]), i = 21e4;
		a = await crypto.subtle.deriveKey({
			name: "PBKDF2",
			salt: t,
			iterations: i,
			hash: "SHA-256"
		}, r, {
			name: "AES-GCM",
			length: 256
		}, !1, ["encrypt"]), s.salt = x(t), s.iterations = i, o = x(new TextEncoder().encode(e));
	}
	let c = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: i
	}, a, r);
	return {
		blob: new Blob([c], { type: "application/octet-stream" }),
		metadata: s,
		keyFragment: "#key=" + o
	};
}
async function C(e, t, n, r) {
	if (document.getElementById("encryptToggle").checked && (!window.crypto || !window.crypto.subtle)) throw Error("Encryption requires a secure context (HTTPS)");
	let i = new FormData();
	i.append("slug", r);
	let a = document.getElementById("metaTitle").value.trim(), o = document.getElementById("metaDescription").value.trim(), s = document.getElementById("metaTags").value.trim();
	a && i.append("title", a), o && i.append("description", o), s && i.append("tags", s);
	let c = document.getElementById("sharePassword").value, l = document.getElementById("expirySelect").value;
	if (c && i.append("password", c), l && l !== "0" && i.append("expiresIn", l), !document.getElementById("encryptToggle").checked) return e === "code" ? i.append("code", t) : i.append("file", t, n), {
		formData: i,
		keyFragment: ""
	};
	let u = await S(e === "code" ? new Blob([t], { type: "text/html" }) : t, document.getElementById("keyMode").value);
	return i.append("encrypted", "1"), i.append("encryption_metadata", JSON.stringify(u.metadata)), i.append("file", u.blob, n || "encrypted.html"), {
		formData: i,
		keyFragment: u.keyFragment
	};
}
async function w(e, t) {
	let r = t.innerHTML;
	t.innerHTML = "<div class=\"spinner\"></div> " + n("btnGenerating"), t.disabled = !0, t.dataset.loading = "true";
	let i = document.getElementById("resultBox"), a = document.getElementById("resultTitle"), o = document.getElementById("resultUrl"), s = document.getElementById("resultHint");
	try {
		let t = await e(), r = await c("/api/upload", t.formData);
		i.style.display = "block", i.className = "result-box success", a.textContent = n("successMsg"), o.value = r.url + (t.keyFragment || ""), s.textContent = t.keyFragment ? n("keyOnceMsg") : n("manageHint");
	} catch (e) {
		i.style.display = "block", i.className = "result-box error", a.textContent = "❌ " + e.message, o.value = "", s.textContent = "";
	} finally {
		t.innerHTML = r, t.disabled = !1, t.dataset.loading = "false";
	}
}
function T(e) {
	let t = document.getElementById("dropZone"), r = t.querySelector("p");
	r.innerHTML = "<span>" + n("selectedPrefix") + "</span><span class=\"link\"></span>", r.querySelector(".link").textContent = e, t.querySelector("svg").style.color = "var(--text-main)";
}
function E() {
	let e = document.getElementById("fileInput"), t = document.getElementById("dropZone");
	t.addEventListener("click", () => e.click()), t.addEventListener("dragover", (e) => {
		e.preventDefault(), t.classList.add("dragover");
	}), t.addEventListener("dragleave", () => t.classList.remove("dragover")), t.addEventListener("drop", (n) => {
		n.preventDefault(), t.classList.remove("dragover"), n.dataTransfer.files.length && (e.files = n.dataTransfer.files, T(n.dataTransfer.files[0].name));
	}), e.addEventListener("change", () => {
		e.files.length && T(e.files[0].name);
	}), document.getElementById("btn-file").addEventListener("click", function() {
		if (!e.files.length) {
			alert(n("errEmptyFile"));
			return;
		}
		let t = e.files[0], r = document.getElementById("slug-file").value;
		w(() => C("file", t, t.name, r), this);
	}), document.getElementById("btn-code").addEventListener("click", function() {
		let e = document.getElementById("codeInput").value.trim();
		if (!e) {
			alert(n("errEmptyCode"));
			return;
		}
		let t = document.getElementById("slug-code").value;
		w(() => C("code", e, "pasted-code.html", t), this);
	});
}
//#endregion
//#region src/ui/modules/ui.js
function D() {
	let e = document.querySelectorAll(".tab"), t = document.querySelectorAll(".panel");
	e.forEach((n) => {
		n.addEventListener("click", () => {
			e.forEach((e) => e.classList.remove("active")), t.forEach((e) => e.classList.remove("active")), n.classList.add("active"), document.getElementById(n.dataset.target).classList.add("active"), document.getElementById("resultBox").style.display = "none";
		});
	});
}
function O() {
	document.getElementById("copyBtn").addEventListener("click", function() {
		let e = document.getElementById("resultUrl");
		e.value && navigator.clipboard.writeText(e.value).then(() => {
			this.textContent = n("copiedBtn"), this.classList.add("copied"), setTimeout(() => {
				this.textContent = n("copyBtn"), this.classList.remove("copied");
			}, 2e3);
		}).catch(() => {
			alert(n("errCopy"));
		});
	});
}
function k() {
	let e = document.getElementById("upgradeBtn"), t = document.getElementById("upgradeModal"), r = document.getElementById("upgradeSendBtn"), i = document.getElementById("upgradeSection");
	e && e.addEventListener("click", () => {
		t.classList.add("active");
	}), r && r.addEventListener("click", () => {
		let e = encodeURIComponent(n("upgradeEmailSubject")), t = encodeURIComponent(n("upgradeEmailBody"));
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
function A(e, t, n, r, i, a) {
	e.beginPath(), e.moveTo(t + a, n), e.arcTo(t + r, n, t + r, n + i, a), e.arcTo(t + r, n + i, t, n + i, a), e.arcTo(t, n + i, t, n, a), e.arcTo(t, n, t + r, n, a), e.closePath();
}
function j(e) {
	if (typeof qrcode > "u") {
		alert(n("imgFail"));
		return;
	}
	let t = qrcode(0, "M");
	t.addData(e), t.make();
	let r = new Image();
	r.onload = () => {
		let t = document.getElementById("shareCanvas");
		t.width = 1280, t.height = 1800, t.style.width = "100%", t.style.maxWidth = "380px";
		let i = t.getContext("2d");
		i.scale(2, 2), i.fillStyle = "#fff", i.fillRect(0, 0, 640, 900);
		let a = i.createLinearGradient(0, 0, 640, 0);
		a.addColorStop(0, "#6366f1"), a.addColorStop(1, "#8b5cf6"), i.fillStyle = a, i.fillRect(0, 0, 640, 8), i.fillStyle = "#171717", i.font = "bold 36px -apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif", i.textAlign = "center", i.textBaseline = "middle", i.fillText("Oh My Share", 320, 90), i.fillStyle = "#666", i.font = "16px -apple-system,BlinkMacSystemFont,\"PingFang SC\",sans-serif", i.fillText(n("subtitle"), 320, 130), i.fillStyle = "#f8fafc", A(i, 120, 180, 400, 400, 16), i.fill(), i.drawImage(r, 140, 200, 360, 360), i.fillStyle = "#171717", i.font = "bold 20px -apple-system,sans-serif", i.fillText(n("imageHint"), 320, 640), i.fillStyle = "#94a3b8", i.font = "14px ui-monospace,monospace";
		let o = e.length > 55 ? e.slice(0, 52) + "..." : e;
		i.fillText(o, 320, 680), i.strokeStyle = "#e5e5e5", i.lineWidth = 1, i.beginPath(), i.moveTo(80, 800), i.lineTo(560, 800), i.stroke(), i.fillStyle = "#cbd5e1", i.font = "13px -apple-system,sans-serif", i.fillText("Powered by Cloudflare Workers", 320, 840), document.getElementById("imageModal").classList.add("active");
	}, r.onerror = () => alert(n("imgFail")), r.src = t.createDataURL(8, 0);
}
function M() {
	let e = document.getElementById("shareCanvas");
	e.width && e.toBlob((e) => {
		let t = document.createElement("a");
		t.download = "oh-my-share.png", t.href = URL.createObjectURL(e), t.click(), setTimeout(() => URL.revokeObjectURL(t.href), 1e3);
	}, "image/png");
}
function N() {
	document.getElementById("imageModal").classList.remove("active");
}
function P() {
	document.getElementById("imgBtn").addEventListener("click", () => {
		let e = document.getElementById("resultUrl");
		e.value && j(e.value);
	}), document.getElementById("downloadBtn").addEventListener("click", M), document.getElementById("imageModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && N();
	}), document.addEventListener("keydown", (e) => {
		e.key === "Escape" && N();
	});
}
//#endregion
//#region src/ui/modules/webmcp.js
function F() {
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
window.toggleLang = i, r(e.lang), b(), E(), D(), O(), k(), P(), F(), window.updatePricingDisplay && window.updatePricingDisplay(e.lang), window.location.search.includes("oauth_success") && window.history.replaceState({}, "", window.location.pathname);
//#endregion
