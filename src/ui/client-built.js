export const CLIENT_SCRIPT = `//#region \\0rolldown/runtime.js
var e = Object.defineProperty, t = Object.getOwnPropertyDescriptor, n = Object.getOwnPropertyNames, r = Object.prototype.hasOwnProperty, i = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, a = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, o = (i, a, o, s) => {
	if (a && typeof a == "object" || typeof a == "function") for (var c = n(a), l = 0, u = c.length, d; l < u; l++) d = c[l], !r.call(i, d) && d !== o && e(i, d, {
		get: ((e) => a[e]).bind(null, d),
		enumerable: !(s = t(a, d)) || s.enumerable
	});
	return i;
}, s = (t) => r.call(t, "module.exports") ? t["module.exports"] : o(e({}, "__esModule", { value: !0 }), t), c, l = i((() => {
	c = {
		user: null,
		canEncrypt: !1,
		lang: "zh",
		authMode: "login"
	};
})), u = /* @__PURE__ */ a({
	applyLang: () => f,
	getTranslations: () => m,
	t: () => d,
	toggleLang: () => p
});
function d(e) {
	return h[c.lang]?.[e] || h.en?.[e] || e;
}
function f(e) {
	c.lang = e;
	let t = h[e];
	if (!t) return;
	document.documentElement.lang = t.htmlLang, document.title = "Oh My Share - " + t.subtitle;
	let n = document.querySelectorAll("[data-i18n]");
	for (let e = 0; e < n.length; e++) {
		let r = n[e], i = t[r.getAttribute("data-i18n")];
		if (i !== void 0) {
			if (r.tagName === "INPUT" || r.tagName === "TEXTAREA") r.placeholder = i;
			else if (r.dataset.loading === "true") continue;
			else r.textContent = i;
		}
	}
	let r = document.getElementById("langBtnText");
	r && (r.textContent = e === "zh" ? "EN" : "中文"), window.updatePricingDisplay && window.updatePricingDisplay(e);
}
function p() {
	f(c.lang === "zh" ? "en" : "zh");
}
function m() {
	return h[c.lang];
}
var h, g = i((() => {
	l(), h = JSON.parse(document.getElementById("i18n-data").textContent);
}));
//#endregion
//#region src/ui/modules/api.js
g();
async function _(e, t = {}) {
	let n = await fetch(e, t), r = await n.text(), i;
	try {
		i = JSON.parse(r);
	} catch {
		i = { error: r };
	}
	if (!n.ok) throw Error(i.error || d("authError"));
	return i;
}
function v(e) {
	return _(e, { headers: { Accept: "application/json" } });
}
function y(e, t) {
	return _(e, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(t)
	});
}
function b(e, t) {
	return _(e, {
		method: "POST",
		body: t
	});
}
function x(e) {
	return _(e, { method: "DELETE" });
}
l(), g();
async function S() {
	if (!c.user) return;
	let e = document.getElementById("assetList");
	e.replaceChildren();
	try {
		let t = await v("/api/assets");
		if (!t.assets.length) {
			let t = document.createElement("div");
			t.className = "asset-empty", t.textContent = d("assetsEmpty"), e.appendChild(t);
			return;
		}
		t.assets.forEach((t) => {
			let n = document.createElement("div");
			n.className = "asset-row";
			let r = document.createElement("div");
			r.style.cssText = "flex:1;min-width:0";
			let i = document.createElement("a");
			if (i.href = t.url, i.target = "_blank", i.rel = "noopener noreferrer", i.textContent = t.title || t.filename || t.id, i.className = "asset-title", r.appendChild(i), t.tags) {
				let e = document.createElement("div");
				e.className = "asset-tags", t.tags.split(",").forEach((t) => {
					if (t = t.trim(), t) {
						let n = document.createElement("span");
						n.className = "asset-tag", n.textContent = t, e.appendChild(n);
					}
				}), r.appendChild(e);
			}
			let a = document.createElement("small");
			a.textContent = t.encrypted ? "AES-GCM" : "HTML";
			let o = document.createElement("div");
			if (o.className = "asset-actions", t.editToken) {
				let e = document.createElement("a");
				e.href = \`/manage/\${t.id}?token=\${t.editToken}\`, e.target = "_blank", e.className = "asset-manage", e.textContent = d("manageBtn"), o.appendChild(e);
			}
			let s = document.createElement("button");
			s.className = "asset-delete", s.type = "button", s.textContent = d("deleteAsset"), s.addEventListener("click", () => C(t.id)), o.appendChild(s), n.appendChild(r), n.appendChild(a), n.appendChild(o), e.appendChild(n);
		});
	} catch (t) {
		let n = document.createElement("div");
		n.className = "asset-empty", n.textContent = t.message || d("authError"), e.appendChild(n);
	}
}
async function C(e) {
	if (window.confirm(d("deleteConfirm"))) try {
		await x("/api/assets/" + encodeURIComponent(e)), S();
	} catch (e) {
		window.alert(e.message || d("authError"));
	}
}
l(), g();
async function w() {
	try {
		let e = await v("/api/auth/me");
		c.user = e.user, c.canEncrypt = e.canEncrypt === !0;
	} catch {
		c.user = null, c.canEncrypt = !1;
	}
	T();
}
function T() {
	let e = document.getElementById("accountBtn"), t = document.getElementById("authView"), n = document.getElementById("accountView");
	c.user ? (e.textContent = c.user.email, t.hidden = !0, n.hidden = !1, document.getElementById("accountEmail").textContent = c.user.email, S(), E()) : (e.textContent = d("accountBtn"), t.hidden = !1, n.hidden = !0), D(), window.updateUpgradeVisibility && window.updateUpgradeVisibility(c.canEncrypt);
}
async function E() {
	let e = document.getElementById("manageList");
	if (e) try {
		let t = (await v("/api/shares")).shares || [];
		if (t.length === 0) {
			e.innerHTML = \`<p class="empty-hint">\${d("noSharesYet")}</p>\`;
			return;
		}
		e.innerHTML = t.map((e) => \`
      <div class="manage-item">
        <div class="manage-item-info">
          <div class="manage-item-title">\${e.title || e.id}</div>
          <div class="manage-item-token">\${d("shareItemToken")}: \${e.editToken.slice(0, 12)}...</div>
        </div>
        <div class="manage-item-actions">
          <a href="/view/\${e.id}" target="_blank" class="manage-item-btn">\${d("shareItemView")}</a>
          <a href="/manage/\${e.id}?token=\${e.editToken}" target="_blank" class="manage-item-btn primary">\${d("shareItemManage")}</a>
        </div>
      </div>
    \`).join("");
	} catch {
		e.innerHTML = \`<p class="empty-hint">\${d("noSharesYet")}</p>\`;
	}
}
function D() {
	let e = document.getElementById("encryptToggle"), t = document.getElementById("encryptStatus"), n = document.getElementById("encryptDetails"), r = document.getElementById("passphraseInput");
	e.disabled = !c.canEncrypt, t.textContent = c.user ? c.canEncrypt ? d("encryptReady") : d("encryptPaidRequired") : d("encryptSignIn"), c.canEncrypt || (e.checked = !1), n.hidden = !e.checked, r.hidden = !e.checked || document.getElementById("keyMode").value !== "passphrase";
}
function O() {
	let e = c.authMode === "register";
	document.getElementById("authModeTitle").textContent = d(e ? "registerTitle" : "loginTitle"), document.getElementById("authSubmit").textContent = d(e ? "registerSubmit" : "loginSubmit"), document.getElementById("authModeSwitch").textContent = d(e ? "switchToLogin" : "switchToRegister"), document.getElementById("authPassword").autocomplete = e ? "new-password" : "current-password";
}
async function k(e) {
	e.preventDefault();
	let t = document.getElementById("authSubmit"), n = document.getElementById("authMessage");
	t.disabled = !0, n.textContent = "";
	try {
		let e = await y("/api/auth/" + c.authMode, {
			email: document.getElementById("authEmail").value,
			password: document.getElementById("authPassword").value
		});
		c.user = e.user, c.canEncrypt = !1, await w(), document.getElementById("authPassword").value = "";
	} catch (e) {
		n.textContent = e.message || d("authError");
	} finally {
		t.disabled = !1;
	}
}
async function A() {
	await fetch("/api/auth/logout", { method: "POST" }), c.user = null, c.canEncrypt = !1, T();
}
function j() {
	document.getElementById("accountModal").classList.add("active"), c.user && S();
}
function M() {
	document.getElementById("accountModal").classList.remove("active"), document.getElementById("authMessage").textContent = "";
}
function N() {
	document.getElementById("accountBtn").addEventListener("click", j), document.getElementById("accountClose").addEventListener("click", M), document.getElementById("authForm").addEventListener("submit", k), document.getElementById("authModeSwitch").addEventListener("click", () => {
		c.authMode = c.authMode === "login" ? "register" : "login", O(), document.getElementById("authMessage").textContent = "";
	}), document.getElementById("logoutBtn").addEventListener("click", A), document.getElementById("addShareBtn").addEventListener("click", () => {
		M(), window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	}), document.getElementById("encryptToggle").addEventListener("change", D), document.getElementById("keyMode").addEventListener("change", D), document.getElementById("accountModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && M();
	}), O(), w();
}
//#endregion
//#region src/ui/modules/upload.js
g();
function P(e) {
	let t = e instanceof Uint8Array ? e : new Uint8Array(e), n = "";
	for (let e = 0; e < t.length; e++) n += String.fromCharCode(t[e]);
	return btoa(n).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}
async function F(e, t) {
	let n = new Uint8Array(await e.arrayBuffer()), r = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12)), i, a, o = {
		version: 1,
		algorithm: "AES-GCM",
		keyMode: t,
		iv: P(r)
	};
	if (t === "random") i = await crypto.subtle.generateKey({
		name: "AES-GCM",
		length: 256
	}, !0, ["encrypt"]), a = P(await crypto.subtle.exportKey("raw", i));
	else {
		let e = document.getElementById("passphraseInput").value;
		if (!e) throw Error(d("keyRequired"));
		let t = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16)), n = await crypto.subtle.importKey("raw", new TextEncoder().encode(e), "PBKDF2", !1, ["deriveKey"]), r = 21e4;
		i = await crypto.subtle.deriveKey({
			name: "PBKDF2",
			salt: t,
			iterations: r,
			hash: "SHA-256"
		}, n, {
			name: "AES-GCM",
			length: 256
		}, !1, ["encrypt"]), o.salt = P(t), o.iterations = r, a = P(new TextEncoder().encode(e));
	}
	let s = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: r
	}, i, n);
	return {
		blob: new Blob([s], { type: "application/octet-stream" }),
		metadata: o,
		keyFragment: "#key=" + a
	};
}
async function I(e, t, n, r) {
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
	let u = await F(e === "code" ? new Blob([t], { type: "text/html" }) : t, document.getElementById("keyMode").value);
	return i.append("encrypted", "1"), i.append("encryption_metadata", JSON.stringify(u.metadata)), i.append("file", u.blob, n || "encrypted.html"), {
		formData: i,
		keyFragment: u.keyFragment
	};
}
async function L(e, t) {
	let n = t.innerHTML;
	t.innerHTML = "<div class=\\"spinner\\"></div> " + d("btnGenerating"), t.disabled = !0, t.dataset.loading = "true";
	let r = document.getElementById("resultBox"), i = document.getElementById("resultTitle"), a = document.getElementById("resultUrl"), o = document.getElementById("resultHint");
	try {
		let t = await e(), n = await b("/api/upload", t.formData);
		r.style.display = "block", r.className = "result-box success", i.textContent = d("successMsg"), a.value = n.url + (t.keyFragment || ""), o.textContent = t.keyFragment ? d("keyOnceMsg") : d("manageHint");
	} catch (e) {
		r.style.display = "block", r.className = "result-box error", i.textContent = "❌ " + e.message, a.value = "", o.textContent = "";
	} finally {
		t.innerHTML = n, t.disabled = !1, t.dataset.loading = "false";
	}
}
function R(e) {
	let t = document.getElementById("dropZone"), n = t.querySelector("p");
	n.innerHTML = "<span>" + d("selectedPrefix") + "</span><span class=\\"link\\"></span>", n.querySelector(".link").textContent = e, t.querySelector("svg").style.color = "var(--text-main)";
}
function z() {
	let e = document.getElementById("fileInput"), t = document.getElementById("dropZone");
	t.addEventListener("click", () => e.click()), t.addEventListener("dragover", (e) => {
		e.preventDefault(), t.classList.add("dragover");
	}), t.addEventListener("dragleave", () => t.classList.remove("dragover")), t.addEventListener("drop", (n) => {
		n.preventDefault(), t.classList.remove("dragover"), n.dataTransfer.files.length && (e.files = n.dataTransfer.files, R(n.dataTransfer.files[0].name));
	}), e.addEventListener("change", () => {
		e.files.length && R(e.files[0].name);
	}), document.getElementById("btn-file").addEventListener("click", function() {
		if (!e.files.length) {
			alert(d("errEmptyFile"));
			return;
		}
		let t = e.files[0], n = document.getElementById("slug-file").value;
		L(() => I("file", t, t.name, n), this);
	}), document.getElementById("btn-code").addEventListener("click", function() {
		let e = document.getElementById("codeInput").value.trim();
		if (!e) {
			alert(d("errEmptyCode"));
			return;
		}
		let t = document.getElementById("slug-code").value;
		L(() => I("code", e, "pasted-code.html", t), this);
	});
}
//#endregion
//#region src/ui/modules/ui.js
function B() {
	let e = document.querySelectorAll(".tab"), t = document.querySelectorAll(".panel");
	e.forEach((n) => {
		n.addEventListener("click", () => {
			e.forEach((e) => e.classList.remove("active")), t.forEach((e) => e.classList.remove("active")), n.classList.add("active"), document.getElementById(n.dataset.target).classList.add("active"), document.getElementById("resultBox").style.display = "none";
		});
	});
}
function V() {
	document.getElementById("copyBtn").addEventListener("click", function() {
		let e = document.getElementById("resultUrl");
		if (!e.value) return;
		let { t } = (g(), s(u));
		navigator.clipboard.writeText(e.value).then(() => {
			this.textContent = t("copiedBtn"), this.classList.add("copied"), setTimeout(() => {
				this.textContent = t("copyBtn"), this.classList.remove("copied");
			}, 2e3);
		}).catch(() => {
			alert(t("errCopy"));
		});
	});
}
function H() {
	let e = document.getElementById("upgradeBtn"), t = document.getElementById("upgradeModal"), n = document.getElementById("upgradeSendBtn"), r = document.getElementById("upgradeSection");
	e && e.addEventListener("click", () => {
		t.classList.add("active");
	}), n && n.addEventListener("click", () => {
		let { t: e } = (g(), s(u)), t = encodeURIComponent(e("upgradeEmailSubject")), n = encodeURIComponent(e("upgradeEmailBody"));
		window.location.href = \`mailto:1400875096@qq.com?subject=\${t}&body=\${n}\`;
	}), window.closeUpgradeModal = function() {
		t.classList.remove("active");
	}, window.updateUpgradeVisibility = function(e) {
		r && (r.style.display = e ? "none" : "block");
	}, window.updatePricingDisplay = function(e) {
		let t = document.getElementById("pricingMain"), n = document.getElementById("pricingAlt");
		t && n && (e === "zh" ? (t.textContent = "¥9.9/月", n.textContent = "$1.9/月") : (t.textContent = "$1.9/月", n.textContent = "¥9.9/月"));
	};
}
//#endregion
//#region src/ui/modules/share.js
g();
function U(e, t, n, r, i, a) {
	e.beginPath(), e.moveTo(t + a, n), e.arcTo(t + r, n, t + r, n + i, a), e.arcTo(t + r, n + i, t, n + i, a), e.arcTo(t, n + i, t, n, a), e.arcTo(t, n, t + r, n, a), e.closePath();
}
function W(e) {
	if (typeof qrcode > "u") {
		alert(d("imgFail"));
		return;
	}
	let t = qrcode(0, "M");
	t.addData(e), t.make();
	let n = new Image();
	n.onload = () => {
		let t = document.getElementById("shareCanvas");
		t.width = 1280, t.height = 1800, t.style.width = "100%", t.style.maxWidth = "380px";
		let r = t.getContext("2d");
		r.scale(2, 2), r.fillStyle = "#fff", r.fillRect(0, 0, 640, 900);
		let i = r.createLinearGradient(0, 0, 640, 0);
		i.addColorStop(0, "#6366f1"), i.addColorStop(1, "#8b5cf6"), r.fillStyle = i, r.fillRect(0, 0, 640, 8), r.fillStyle = "#171717", r.font = "bold 36px -apple-system,BlinkMacSystemFont,\\"PingFang SC\\",\\"Microsoft YaHei\\",sans-serif", r.textAlign = "center", r.textBaseline = "middle", r.fillText("Oh My Share", 320, 90), r.fillStyle = "#666", r.font = "16px -apple-system,BlinkMacSystemFont,\\"PingFang SC\\",sans-serif", r.fillText(d("subtitle"), 320, 130), r.fillStyle = "#f8fafc", U(r, 120, 180, 400, 400, 16), r.fill(), r.drawImage(n, 140, 200, 360, 360), r.fillStyle = "#171717", r.font = "bold 20px -apple-system,sans-serif", r.fillText(d("imageHint"), 320, 640), r.fillStyle = "#94a3b8", r.font = "14px ui-monospace,monospace";
		let a = e.length > 55 ? e.slice(0, 52) + "..." : e;
		r.fillText(a, 320, 680), r.strokeStyle = "#e5e5e5", r.lineWidth = 1, r.beginPath(), r.moveTo(80, 800), r.lineTo(560, 800), r.stroke(), r.fillStyle = "#cbd5e1", r.font = "13px -apple-system,sans-serif", r.fillText("Powered by Cloudflare Workers", 320, 840), document.getElementById("imageModal").classList.add("active");
	}, n.onerror = () => alert(d("imgFail")), n.src = t.createDataURL(8, 0);
}
function G() {
	let e = document.getElementById("shareCanvas");
	e.width && e.toBlob((e) => {
		let t = document.createElement("a");
		t.download = "oh-my-share.png", t.href = URL.createObjectURL(e), t.click(), setTimeout(() => URL.revokeObjectURL(t.href), 1e3);
	}, "image/png");
}
function K() {
	document.getElementById("imageModal").classList.remove("active");
}
function q() {
	document.getElementById("imgBtn").addEventListener("click", () => {
		let e = document.getElementById("resultUrl");
		e.value && W(e.value);
	}), document.getElementById("downloadBtn").addEventListener("click", G), document.getElementById("imageModal").addEventListener("click", (e) => {
		e.target === e.currentTarget && K();
	}), document.addEventListener("keydown", (e) => {
		e.key === "Escape" && K();
	});
}
l(), g(), window.toggleLang = p, f(c.lang), N(), z(), B(), V(), H(), q(), window.updatePricingDisplay && window.updatePricingDisplay(c.lang);
//#endregion
`;