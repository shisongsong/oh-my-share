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
	a && (a.textContent = e === "zh" ? "EN" : "中文"), window.updatePricingDisplay && window.updatePricingDisplay(e), window.refreshGreeting?.();
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
			o.textContent = t.kind === "site" ? r("siteKind") || "SITE" : t.encrypted ? "AES-GCM" : "HTML";
			let s = document.createElement("div");
			s.className = "asset-actions";
			let c = document.createElement("a");
			if (c.href = t.editToken ? `/manage/${t.id}?token=${t.editToken}` : `/view/${t.id}`, c.target = "_blank", c.className = "asset-manage", c.textContent = r("manageBtn"), s.appendChild(c), t.kind !== "site") {
				let e = document.createElement("button");
				e.className = "asset-publish", e.type = "button", e.textContent = t.published ? r("unpublishBtn") : r("publishBtn");
				let n = t.expiresAt && t.expiresAt * 1e3 <= Date.now(), i = t.encrypted || t.passwordProtected || n;
				!t.published && i && (e.disabled = !0, e.title = r("errCannotPublish")), e.addEventListener("click", () => p(t)), s.appendChild(e);
			}
			let l = document.createElement("button");
			l.className = "asset-delete", l.type = "button", l.textContent = r("deleteAsset"), l.addEventListener("click", () => f(t.id)), s.appendChild(l), n.appendChild(i), n.appendChild(o), n.appendChild(s), e.appendChild(n);
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
	t.user ? (e.textContent = t.user.email, n.hidden = !0, i.hidden = !1, document.getElementById("accountEmail").textContent = t.user.email, d()) : (e.textContent = r("accountBtn"), n.hidden = !1, i.hidden = !0);
	let a = document.getElementById("folderGate"), o = document.getElementById("folderSigned");
	a && o && (a.hidden = !!t.user, o.hidden = !t.user), g(), window.refreshGenerateButton?.(), window.updateUpgradeVisibility && window.updateUpgradeVisibility(t.canEncrypt);
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
	});
	let e = document.getElementById("folderSignin");
	e && e.addEventListener("click", () => {
		t.authMode = "register", _(), b();
	}), _();
	let n = new URLSearchParams(window.location.search).get("auth");
	m().then(() => {
		!t.user && (n === "register" || n === "login") && (t.authMode = n, _(), b());
	});
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
async function E(e, t, n = "/api/upload") {
	let i = t.innerHTML;
	t.innerHTML = "<div class=\"spinner\"></div> " + r("btnGenerating"), t.disabled = !0, t.dataset.loading = "true";
	let a = document.getElementById("resultBox"), o = document.getElementById("resultUrl");
	try {
		let t = await e(), r = await l(n, t.formData);
		a.hidden = !1, a.className = "result-box", o.value = r.url + (t.keyFragment || "");
	} catch (e) {
		a.hidden = !1, a.className = "result-box error", o.value = "❌ " + e.message;
	} finally {
		t.innerHTML = i, t.dataset.loading = "false", window.refreshGenerateButton?.();
	}
}
function D(e) {
	let t = document.getElementById("dropZone"), n = t.querySelector(".drop-title") || t.querySelector("p");
	if (!n) return;
	n.innerHTML = "<span>" + r("selectedPrefix") + "</span><span class=\"link\"></span>", n.querySelector(".link").textContent = e;
	let i = t.querySelector("svg");
	i && (i.style.color = "var(--text-main)");
}
function O(e) {
	return e ? e < 1024 ? e + " B" : e < 1048576 ? (e / 1024).toFixed(1) + " KB" : (e / 1048576).toFixed(1) + " MB" : "0 B";
}
var k = [];
function A(e) {
	k = e;
	let t = document.getElementById("folderInfo");
	if (t) {
		if (!e.length) t.hidden = !0, t.textContent = "";
		else {
			let n = e.reduce((e, t) => e + (t.file.size || 0), 0);
			t.hidden = !1, t.textContent = r("folderSelected").replace("{n}", String(e.length)).replace("{size}", O(n));
		}
	}
	window.refreshGenerateButton?.();
}
function j(e) {
	return Array.from(e).map((e) => ({
		file: e,
		path: e.webkitRelativePath || e.name
	}));
}
function M(e) {
	return new Promise((t, n) => {
		let r = [], i = () => e.readEntries((e) => {
			e.length ? (r.push(...e), i()) : t(r);
		}, n);
		i();
	});
}
async function N(e, t, n) {
	if (e.isFile) {
		let r = await new Promise((t, n) => e.file(t, n));
		n.push({
			file: r,
			path: `${t}${e.name}`
		});
		return;
	}
	if (e.isDirectory) {
		let r = await M(e.createReader());
		for (let i of r) await N(i, `${t}${e.name}/`, n);
	}
}
async function P(e) {
	let t = e.items;
	if (t && t.length && typeof t[0].webkitGetAsEntry == "function") {
		let e = [];
		for (let n of t) {
			let t = n.webkitGetAsEntry();
			t && await N(t, "", e);
		}
		if (e.length) return e;
	}
	return j(e.files);
}
function F() {
	let e = new FormData();
	e.append("folder", (k[0]?.path || "site").split("/")[0]);
	let t = document.getElementById("metaTitle").value.trim(), n = document.getElementById("metaDescription").value.trim(), r = document.getElementById("metaTags").value.trim();
	t && e.append("title", t), n && e.append("description", n), r && e.append("tags", r);
	let i = document.getElementById("expirySelect").value;
	i && i !== "0" && e.append("expiresIn", i);
	for (let t of k) e.append("files", t.file, t.path);
	return {
		formData: e,
		keyFragment: ""
	};
}
function I() {
	let e = document.getElementById("fileInput");
	window.refreshGenerateButton = () => {
		let n = document.getElementById("btn-file");
		if (!n) return;
		let r = document.getElementById("panel-folder"), i = document.getElementById("panel-code"), a = document.getElementById("codeInput"), o = r && r.classList.contains("active"), s = i && i.classList.contains("active"), c = !!(e && e.files && e.files.length), l = !!(a && a.value.trim()), u = k.length > 0 && !!t.user;
		n.disabled = o ? !u : s ? !l : !c;
	};
	let n = document.getElementById("dropZone");
	n.addEventListener("click", () => e.click()), n.addEventListener("keydown", (t) => {
		(t.key === "Enter" || t.key === " ") && (t.preventDefault(), e.click());
	}), n.addEventListener("dragover", (e) => {
		e.preventDefault(), n.classList.add("dragover");
	}), n.addEventListener("dragleave", () => n.classList.remove("dragover")), n.addEventListener("drop", (t) => {
		t.preventDefault(), n.classList.remove("dragover"), t.dataTransfer.files.length && (e.files = t.dataTransfer.files, D(t.dataTransfer.files[0].name), window.refreshGenerateButton?.());
	}), e.addEventListener("change", () => {
		e.files.length && D(e.files[0].name), window.refreshGenerateButton?.();
	});
	let i = document.getElementById("codeInput");
	i && i.addEventListener("input", () => window.refreshGenerateButton?.()), document.getElementById("btn-file").addEventListener("click", function() {
		let t = document.getElementById("panel-folder");
		if (t && t.classList.contains("active")) return;
		let n = document.getElementById("panel-code"), i = document.getElementById("slug-file").value;
		if (n && n.classList.contains("active")) {
			let e = document.getElementById("codeInput").value.trim();
			if (!e) {
				alert(r("errEmptyCode"));
				return;
			}
			E(() => T("code", e, "pasted-code.html", i), this);
			return;
		}
		if (!e.files.length) {
			alert(r("errEmptyFile"));
			return;
		}
		let a = e.files[0];
		E(() => T("file", a, a.name, i), this);
	});
	let a = document.getElementById("folderInput"), o = document.getElementById("folderDropZone");
	a && o && (o.addEventListener("click", (e) => {
		e.target !== a && a.click();
	}), o.addEventListener("keydown", (e) => {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), a.click());
	}), o.addEventListener("dragover", (e) => {
		e.preventDefault(), o.classList.add("dragover");
	}), o.addEventListener("dragleave", () => o.classList.remove("dragover")), o.addEventListener("drop", async (e) => {
		e.preventDefault(), o.classList.remove("dragover"), A(await P(e.dataTransfer));
	}), a.addEventListener("change", () => {
		A(j(a.files));
	})), document.getElementById("btn-file").addEventListener("click", function() {
		let e = document.getElementById("panel-folder");
		if (e && e.classList.contains("active")) {
			if (!k.length) {
				alert(r("errSiteEmpty"));
				return;
			}
			if (k.length > 200) {
				alert(r("errSiteTooMany"));
				return;
			}
			if (k.reduce((e, t) => e + (t.file.size || 0), 0) > 20971520) {
				alert(r("errSiteTooLarge"));
				return;
			}
			if (k.some((e) => (e.file.size || 0) > 5242880)) {
				alert(r("errSiteFileTooLarge"));
				return;
			}
			if (!t.user) {
				t.authMode = "register", _(), b(), alert(r("errSiteAuth"));
				return;
			}
			E(F, this, "/api/upload-site");
		}
	});
}
//#endregion
//#region src/ui/modules/ui.js
function ee() {
	let e = Array.from(document.querySelectorAll(".upload-tab")), t = document.querySelectorAll(".upload-panel");
	e.forEach((n, i) => {
		n.dataset.target && n.setAttribute("aria-controls", n.dataset.target), n.tabIndex = n.classList.contains("active") ? 0 : -1, n.addEventListener("keydown", (t) => {
			let n = i;
			if (t.key === "ArrowRight") n = (i + 1) % e.length;
			else if (t.key === "ArrowLeft") n = (i - 1 + e.length) % e.length;
			else if (t.key === "Home") n = 0;
			else if (t.key === "End") n = e.length - 1;
			else return;
			t.preventDefault(), e[n].focus(), e[n].click();
		}), n.addEventListener("click", () => {
			e.forEach((e) => {
				e.classList.remove("active"), e.setAttribute("aria-selected", "false"), e.tabIndex = -1;
			}), t.forEach((e) => {
				e.classList.remove("active"), e.hidden = !0;
			}), n.classList.add("active"), n.setAttribute("aria-selected", "true"), n.tabIndex = 0;
			let i = document.getElementById(n.dataset.target);
			i.classList.add("active"), i.hidden = !1;
			let a = n.dataset.target === "panel-folder";
			document.querySelectorAll(".folder-hide").forEach((e) => {
				a ? (e.hasAttribute("data-folder-hidden") || e.setAttribute("data-folder-hidden", e.hidden ? "1" : "0"), e.hidden = !0) : e.hasAttribute("data-folder-hidden") && (e.hidden = e.getAttribute("data-folder-hidden") === "1", e.removeAttribute("data-folder-hidden"));
			});
			let o = n.dataset.target === "panel-code", s = document.getElementById("slug-file");
			if (s) {
				let e = o ? "slugPlaceholderCode" : "slugPlaceholderFile";
				s.dataset.i18n = e, s.placeholder = r(e);
			}
			let c = document.getElementById("resultBox");
			c && (c.hidden = !0), window.refreshGenerateButton?.();
		});
	});
}
function L() {
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
function R() {
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
function z(e, t, n, r, i, a) {
	e.beginPath(), e.moveTo(t + a, n), e.arcTo(t + r, n, t + r, n + i, a), e.arcTo(t + r, n + i, t, n + i, a), e.arcTo(t, n + i, t, n, a), e.arcTo(t, n, t + r, n, a), e.closePath();
}
function B(e) {
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
		a.addColorStop(0, "#6366f1"), a.addColorStop(1, "#8b5cf6"), i.fillStyle = a, i.fillRect(0, 0, 640, 8), i.fillStyle = "#171717", i.font = "bold 36px -apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif", i.textAlign = "center", i.textBaseline = "middle", i.fillText("Oh My Share", 320, 90), i.fillStyle = "#666", i.font = "16px -apple-system,BlinkMacSystemFont,\"PingFang SC\",sans-serif", i.fillText(r("subtitle"), 320, 130), i.fillStyle = "#f8fafc", z(i, 120, 180, 400, 400, 16), i.fill(), i.drawImage(n, 140, 200, 360, 360), i.fillStyle = "#171717", i.font = "bold 20px -apple-system,sans-serif", i.fillText(r("imageHint"), 320, 640), i.fillStyle = "#94a3b8", i.font = "14px ui-monospace,monospace";
		let o = e.length > 55 ? e.slice(0, 52) + "..." : e;
		i.fillText(o, 320, 680), i.strokeStyle = "#e5e5e5", i.lineWidth = 1, i.beginPath(), i.moveTo(80, 800), i.lineTo(560, 800), i.stroke(), i.fillStyle = "#cbd5e1", i.font = "13px -apple-system,sans-serif", i.fillText("Powered by Cloudflare Workers", 320, 840), document.getElementById("imageModal").classList.add("active");
	}, n.onerror = () => alert(r("imgFail")), n.src = t.createDataURL(8, 0);
}
function V() {
	let e = document.getElementById("shareCanvas");
	e.width && e.toBlob((e) => {
		let t = document.createElement("a");
		t.download = "oh-my-share.png", t.href = URL.createObjectURL(e), t.click(), setTimeout(() => URL.revokeObjectURL(t.href), 1e3);
	}, "image/png");
}
function H() {
	document.getElementById("imageModal").classList.remove("active");
}
function U() {
	document.getElementById("imgBtn").addEventListener("click", () => {
		let e = document.getElementById("resultUrl");
		e.value && B(e.value);
	}), document.getElementById("downloadBtn").addEventListener("click", V), document.getElementById("imageModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && H();
	}), document.addEventListener("keydown", (e) => {
		e.key === "Escape" && H();
	});
}
//#endregion
//#region src/ui/modules/webmcp.js
function W() {
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
//#endregion
//#region src/ui/modules/greeting.js
var G = {
	zh: {
		dawn: {
			hello: "早上好，",
			lines: [
				"今天也慢慢来。",
				"先给自己倒杯温水吧。",
				"天刚亮，不着急。"
			]
		},
		morning: {
			hello: "上午好，",
			lines: [
				"今天也有好好生活吗？",
				"先做一件小事，也算开始。",
				"不用急，上午还长。"
			]
		},
		noon: {
			hello: "中午好，",
			lines: [
				"饭吃了没？",
				"先离开屏幕一会儿。",
				"今天也辛苦了。"
			]
		},
		afternoon: {
			hello: "下午好，",
			lines: [
				"今天也有好好生活吗？",
				"泡杯茶再继续。",
				"做一点也算数。"
			]
		},
		evening: {
			hello: "晚上好，",
			lines: [
				"今天也有好好生活吗？",
				"今天辛苦了。",
				"把今天做的东西放上来吧。"
			]
		},
		late: {
			hello: "夜深了，",
			lines: [
				"今天也有好好生活吗？",
				"还在忙吗？记得留一点给自己。",
				"明天再分享也一样。"
			]
		}
	},
	en: {
		dawn: {
			hello: "Good morning, ",
			lines: [
				"take it slowly today.",
				"pour yourself a glass of warm water first.",
				"the day is still young."
			]
		},
		morning: {
			hello: "Good morning, ",
			lines: [
				"did you take care of yourself today?",
				"one small thing is a start.",
				"no rush, the morning is long."
			]
		},
		noon: {
			hello: "Good afternoon, ",
			lines: [
				"have you eaten?",
				"step away from the screen for a moment.",
				"you did enough today."
			]
		},
		afternoon: {
			hello: "Good afternoon, ",
			lines: [
				"did you take care of yourself today?",
				"make some tea before you continue.",
				"a little is still something."
			]
		},
		evening: {
			hello: "Good evening, ",
			lines: [
				"did you take care of yourself today?",
				"you did enough today.",
				"put what you made today here."
			]
		},
		late: {
			hello: "It's late, ",
			lines: [
				"did you take care of yourself today?",
				"still busy? save a little for yourself.",
				"tomorrow is fine too."
			]
		}
	}
};
function K(e) {
	return e >= 5 && e < 9 ? "dawn" : e >= 9 && e < 12 ? "morning" : e >= 12 && e < 14 ? "noon" : e >= 14 && e < 18 ? "afternoon" : e >= 18 && e < 23 ? "evening" : "late";
}
var q = K((/* @__PURE__ */ new Date()).getHours()), J = 0, Y = null;
function X() {
	return t.lang === "en" ? "en" : "zh";
}
function Z(e) {
	let t = document.getElementById("greetHello"), n = document.getElementById("greetLine"), r = document.getElementById("greetLive");
	if (!t || !n) return;
	let i = G[X()][q];
	t.textContent = i.hello, n.textContent = i.lines[J], e && r && (r.textContent = i.hello + i.lines[J]);
}
function Q() {
	let e = G[X()][q].lines;
	if (e.length > 1) {
		let t = J;
		for (; t === J;) t = Math.floor(Math.random() * e.length);
		J = t;
	}
	Z(!0);
}
function $() {
	let e = window.matchMedia("(prefers-reduced-motion: reduce)");
	Y || e.matches || (Y = window.setInterval(() => {
		document.hidden || Q();
	}, 45e3));
}
function te() {
	let e = document.getElementById("specks");
	if (e && !e.childElementCount) for (let t = 0; t < 16; t += 1) {
		let t = document.createElement("span");
		t.className = "speck", t.style.left = (4 + Math.random() * 92).toFixed(2) + "%", t.style.top = (20 + Math.random() * 70).toFixed(2) + "%", t.style.width = (1.6 + Math.random() * 2.8).toFixed(2) + "px", t.style.height = t.style.width, t.style.setProperty("--dur", (24 + Math.random() * 22).toFixed(1) + "s"), t.style.setProperty("--delay", (-Math.random() * 40).toFixed(1) + "s"), t.style.setProperty("--drift", (Math.random() * 60 - 30).toFixed(1) + "px"), t.style.background = Math.random() > .78 ? "rgba(79, 107, 82, 0.32)" : "rgba(120, 94, 58, 0.3)", e.appendChild(t);
	}
}
function ne() {
	q = K((/* @__PURE__ */ new Date()).getHours()), Z(!1);
}
function re() {
	Z(!1), $(), te(), window.refreshGreeting = ne;
	let e = document.getElementById("greetingShuffle");
	e && e.addEventListener("click", () => {
		Q(), Y &&= (window.clearInterval(Y), null), $();
	});
}
window.toggleLang = a, i(t.lang), S(), I(), ee(), re(), L(), R(), U(), W(), window.updatePricingDisplay && window.updatePricingDisplay(t.lang), window.location.search.includes("oauth_success") && window.history.replaceState({}, "", window.location.pathname);
//#endregion
