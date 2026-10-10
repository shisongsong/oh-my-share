import { BASE_CSS, renderNav, renderFooter } from '../ui/theme.js';
import { resolveLang } from '../i18n.js';
import { checkRateLimit, getClientIp } from '../security.js';

const BASE_URL = 'https://openanthropic.com';

const LABELS = {
  en: {
    htmlLang: 'en',
    title: 'Product Demo — Create a real share',
    desc: 'Watch a real share get created on Oh My Share: the page below is the actual product, driven step by step, ending in a real link you can open.',
    eyebrow: 'Real product, real clicks',
    h1a: 'From code to a link, ',
    h1b: 'for real.',
    sub: 'The frame below is the actual app — no mockups. Every playback performs genuine uploads and opens the genuine links they return.',
    step1: 'Paste code in the real app',
    step1d: 'A ghost cursor clicks the real “Paste Code” tab and types the HTML into the real textarea.',
    step2: 'Generate the link',
    step2d: 'The real “Generate Link” button uploads for real (1-hour expiry) and the real result card appears.',
    step3: 'Open the real link',
    step3d: 'The link the server just returned is opened in a second frame — the actual rendered page, sandboxed.',
    step4: 'AI agents publish too',
    step4d: 'A real MCP tools/call publishes a second share over /mcp — watch the actual JSON-RPC exchange.',
    replay: 'Replay with a new upload',
    ctaPrimary: 'Try it yourself',
    ctaSecondary: 'Read the agent guide',
    note: 'Each playback performs two real anonymous uploads (1-hour expiry, auto-purged from storage afterwards; 10 uploads/hour per IP). If the limit is reached the real app shows its own error.',
    errRate: 'Upload limit reached — this is the real app telling you so. Try again later.',
    errDemo: 'Demo limit reached for this network (5 playbacks/hour). Everything you have seen was real — go make your own share.',
    demoUrl: 'openanthropic.com',
    mcpTitle: 'MCP · tools/call upload',
    mcpReq: 'request',
    mcpRes: 'response',
    mcpPublished: 'agent published',
  },
  zh: {
    htmlLang: 'zh-CN',
    title: '产品演示 — 真实创建一次分享',
    desc: '看 Oh My Share 真实完成一次分享：下方就是真实产品本体，由幽灵光标一步步真实操作，最终得到一条真实可打开的链接。',
    eyebrow: '真实产品 · 真实点击',
    h1a: '从一段代码到一条链接，',
    h1b: '全程真实。',
    sub: '下方窗口就是真实的应用本体，没有任何仿造界面。每一次播放都会真实完成上传，并真实打开服务器返回的链接。',
    step1: '在真实应用里粘贴代码',
    step1d: '幽灵光标点击真实的「粘贴代码」标签，把 HTML 输入进真实的文本框。',
    step2: '生成链接',
    step2d: '点击真实的「生成分享链接」按钮，完成一次真实上传（1 小时过期），出现真实的结果卡片。',
    step3: '打开真实链接',
    step3d: '服务器刚返回的链接在第二个窗口中真实打开 — 沙箱渲染后的真实页面。',
    step4: 'AI 也能直接发布',
    step4d: '再通过 /mcp 真实调用一次 tools/call upload，看智能体发布时的真实 JSON-RPC 交互。',
    replay: '重新播放（再来一次真实上传）',
    ctaPrimary: '自己试一试',
    ctaSecondary: '阅读智能体指南',
    note: '每次播放会真实完成两次匿名上传（1 小时过期，之后自动从存储中清除；同一 IP 每小时 10 次上传上限）。达到上限时，你会看到真实应用自己的报错提示。',
    errRate: '上传次数已达上限 — 这是真实应用在提醒你。稍后再试。',
    errDemo: '当前网络演示次数已达上限（每小时 5 次）。你看到的都是真实流程 — 去创建一条自己的分享吧。',
    demoUrl: 'openanthropic.com',
    mcpTitle: 'MCP · tools/call upload',
    mcpReq: '请求',
    mcpRes: '响应',
    mcpPublished: '智能体已发布',
  },
};

const DEMO_CODE = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body>
<div style="font-family:system-ui;padding:48px">
  <h1 style="margin:0">Hello, 分享</h1>
  <p>single-file · sandboxed · instant</p>
</div>
</body>
</html>`;

const CURSOR_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8-6.2 1.4L10 19 5 3z" fill="#111827" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

const STAGE_SCRIPT = `
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var device = document.getElementById('demoDevice');
  var frames = document.getElementById('demoFrames');
  var app = document.getElementById('demoApp');
  var view = document.getElementById('demoView');
  var cursor = document.getElementById('demoCursor');
  var urlPill = document.getElementById('demoUrl');
  var captionEl = document.getElementById('demoCaption');
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
  var replayBtn = document.getElementById('demoReplay');
  var errRate = stage.getAttribute('data-err') || '';
  var errDemo = stage.getAttribute('data-demo-err') || errRate;
  var demoLimited = stage.getAttribute('data-demo-limited') === '1';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var runId = 0;
  var CODE = ${JSON.stringify(DEMO_CODE)};

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function stale(my) { return my !== runId; }

  function setStep(index) {
    stepEls.forEach(function (el) {
      el.classList.toggle('active', Number(el.getAttribute('data-step')) === index);
    });
    var caption = document.querySelector('[data-caption="' + index + '"]');
    if (caption) {
      captionEl.innerHTML = '<span class="cap-num">0' + (index + 1) + '</span><h2>' + caption.getAttribute('data-title') + '</h2><p>' + caption.getAttribute('data-desc') + '</p>';
    }
  }

  function showError(msg) {
    captionEl.innerHTML = '<span class="cap-num">!</span><h2>' + msg + '</h2><p></p>';
    stepEls.forEach(function (el) { el.classList.remove('active'); });
  }

  function setFrame(cls) {
    device.className = 'demo-device ' + cls;
  }

  function frameRectOf(el) {
    var r = el.getBoundingClientRect();
    var f = frames.getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
  }

  function moveTo(el) {
    return new Promise(function (resolve) {
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch (e) {}
      setTimeout(function () {
        var r = el.getBoundingClientRect();
        var f = frames.getBoundingClientRect();
        cursor.style.transition = reduced ? 'none' : 'transform .6s cubic-bezier(.22,1,.36,1)';
        cursor.style.transform = 'translate(' + (r.left - f.left + r.width / 2) + 'px,' + (r.top - f.top + r.height / 2) + 'px)';
        setTimeout(resolve, reduced ? 40 : 620);
      }, reduced ? 30 : 380);
    });
  }

  function clickEl(el) {
    return new Promise(function (resolve) {
      var r = el.getBoundingClientRect();
      var f = frames.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'demo-ripple';
      ripple.style.left = (r.left - f.left + r.width / 2) + 'px';
      ripple.style.top = (r.top - f.top + r.height / 2) + 'px';
      frames.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
      el.classList.add('demo-press');
      el.click();
      setTimeout(function () { el.classList.remove('demo-press'); resolve(); }, reduced ? 60 : 420);
    });
  }

  function waitAppReady() {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function check() {
        var doc;
        try { doc = app.contentDocument; } catch (e) { doc = null; }
        if (doc && doc.getElementById('btn-file') && doc.getElementById('codeInput')) {
          return resolve(doc);
        }
        if (Date.now() - t0 > 10000) return reject(new Error('app timeout'));
        setTimeout(check, 80);
      })();
    });
  }

  function waitResult(doc) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function check() {
        var box = doc.getElementById('resultBox');
        if (box && !box.hidden) {
          var failed = box.className.indexOf('error') !== -1;
          var url = failed ? '' : String(doc.getElementById('resultUrl').value || '');
          return resolve({ failed: failed, url: url });
        }
        if (Date.now() - t0 > 15000) return reject(new Error('result timeout'));
        setTimeout(check, 100);
      })();
    });
  }

  function typeInto(doc, text, my) {
    return new Promise(function (resolve) {
      var ta = doc.getElementById('codeInput');
      ta.focus();
      var i = 0;
      (function tick() {
        if (stale(my)) return resolve(false);
        ta.value = text.slice(0, ++i);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        if (i >= text.length) return resolve(true);
        setTimeout(tick, reduced ? 0 : 16);
      })();
    });
  }

  function loadView(url) {
    return new Promise(function (resolve) {
      view.addEventListener('load', function on() {
        view.removeEventListener('load', on);
        setTimeout(resolve, reduced ? 100 : 900);
      });
      view.src = url;
    });
  }

  // 04 — a real MCP call publishes a second share through /mcp
  function runMcpStep(my) {
    var panel = document.getElementById('demoMcp');
    if (!panel) return Promise.resolve();
    var reqEl = document.getElementById('demoMcpReq');
    var resEl = document.getElementById('demoMcpRes');
    var chip = document.getElementById('demoMcpLink');
    panel.classList.add('show');
    setTimeout(function () {
      try { panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) {}
    }, reduced ? 0 : 350);
    var payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'upload',
        arguments: { content: CODE, filename: 'agent-published.html', expiresIn: '1h' },
      },
    };
    reqEl.textContent = JSON.stringify(payload, null, 2);
    resEl.textContent = '…';
    chip.textContent = '';
    return fetch('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (stale(my)) return;
        var text = data && data.result && data.result.content && data.result.content[0]
          ? data.result.content[0].text
          : JSON.stringify(data);
        resEl.textContent = text;
        try {
          var parsed = JSON.parse(text);
          if (parsed.url) chip.textContent = parsed.url;
        } catch (e) {}
      })
      .catch(function (err) {
        if (stale(my)) return;
        resEl.textContent = 'error: ' + err.message;
      });
  }

  function resetFrames() {
    setFrame('frame-editor');
    urlPill.textContent = stage.getAttribute('data-url') || 'openanthropic.com';
    view.src = 'about:blank';
  }

  function play() {
    var my = ++runId;
    resetFrames();
    setStep(0);
    app.contentWindow.location.reload();

    waitAppReady().then(function (doc) {
      if (stale(my)) return;

      // 01 — click the real “Paste Code” tab
      var tab = doc.querySelector('.upload-tab[data-target="panel-code"]');
      return moveTo(tab).then(function () { return clickEl(tab); }).then(function () {
        if (stale(my)) return null;
        return sleep(reduced ? 0 : 700);
      }).then(function () {
        if (stale(my)) return null;
        // 01b — expand advanced options, pick 1h expiry (real select)
        var summary = doc.querySelector('.upload-options summary');
        return moveTo(summary).then(function () { return clickEl(summary); }).then(function () {
          var sel = doc.getElementById('expirySelect');
          sel.value = '3600';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          if (stale(my)) return null;
          return sleep(reduced ? 0 : 650);
        });
      }).then(function () {
        if (stale(my)) return null;
        return moveTo(doc.getElementById('codeInput'));
      }).then(function () {
        if (stale(my)) return null;
        return typeInto(doc, CODE, my);
      }).then(function (ok) {
        if (!ok || stale(my)) return null;
        // 02 — real upload
        setStep(1);
        return moveTo(doc.getElementById('btn-file')).then(function () {
          return clickEl(doc.getElementById('btn-file'));
        }).then(function () {
          if (stale(my)) return null;
          setFrame('frame-link');
          return waitResult(doc);
        });
      }).then(function (result) {
        if (stale(my) || !result) return;
        if (result.failed) {
          showError(errRate);
          return;
        }
        // 03 — dwell on the real result card, then open the real returned link
        setStep(2);
        urlPill.textContent = result.url.replace(/^https?:\\/\\/[^/]+/, '') || '/view/…';
        try { doc.getElementById('resultBox').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); } catch (e) {}
        setFrame('frame-link');
        return sleep(reduced ? 100 : 2600).then(function () {
          if (stale(my)) return;
          setFrame('frame-nav');
          return loadView(result.url);
        }).then(function () {
          if (stale(my)) return;
          setFrame('frame-render');
        });
      }).then(function () {
        if (stale(my)) return;
        // dwell on the real rendered page (badge included)
        return sleep(reduced ? 100 : 3200);
      }).then(function () {
        if (stale(my)) return;
        // 04 — real MCP publish through /mcp
        setStep(3);
        return runMcpStep(my);
      });
    }).catch(function (err) {
      console.error('demo error', err);
      showError(errRate);
    });
  }

  if (demoLimited) {
    showError(errDemo);
  } else {
    play();
  }

  replayBtn.addEventListener('click', play);
})();
`;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function handleDemo(request, env) {
  const lang = resolveLang(request);
  const t = LABELS[lang] || LABELS.en;

  // Bound demo-driven uploads per network before the real app ever sees them.
  let limited = false;
  if (env && env.DB) {
    try {
      const limit = await checkRateLimit(env, getClientIp(request), 'demo-play', 5, 3600);
      limited = !limit.allowed;
    } catch {
      limited = false;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE_URL}/demo">
<meta property="og:site_name" content="Oh My Share">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${BASE_URL}/demo">
<meta property="og:image" content="${BASE_URL}/og-image.png">
<meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<meta name="twitter:image" content="${BASE_URL}/og-image.png">
<style>${BASE_CSS}
.demo-main {
  max-width: 1060px;
  margin: 0 auto;
  padding: clamp(26px, 4vw, 56px) var(--space-5) var(--space-10);
}
.demo-hero { text-align: center; margin-bottom: clamp(22px, 3.5vw, 40px); }
.demo-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  padding: 6px 14px; margin-bottom: var(--space-5);
}
.demo-eyebrow::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%;
  background: var(--gradient-primary);
  box-shadow: 0 0 10px rgba(255, 92, 124, 0.8);
  animation: demo-pulse 2s ease-in-out infinite;
}
@keyframes demo-pulse { 50% { opacity: 0.3; } }
.demo-hero h1 {
  font-size: clamp(34px, 5.6vw, 56px);
  font-weight: 750; letter-spacing: -0.035em; line-height: 1.08;
  margin-bottom: var(--space-4);
}
.demo-hero h1 em {
  font-style: normal;
  background: var(--gradient-primary);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.demo-hero p {
  max-width: 620px; margin: 0 auto;
  color: var(--color-text-secondary);
  font-size: clamp(14px, 1.6vw, 16.5px); line-height: 1.75;
}

/* ---------- stage ---------- */
.demo-stage {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
  background:
    radial-gradient(1100px 460px at 50% -8%, rgba(92, 225, 212, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
  border: 1px solid var(--color-hairline);
  box-shadow: var(--shadow-card);
}
.demo-stage-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(900px 420px at 50% 30%, #000 30%, transparent 75%);
  pointer-events: none;
}
.demo-device {
  position: relative;
  margin: clamp(12px, 2.6vw, 26px);
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--color-hairline-strong);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.demo-chrome {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-hairline);
  background: #f6f7f9;
}
.demo-dots { display: flex; gap: 6px; }
.demo-dots i { width: 10px; height: 10px; border-radius: 50%; background: #d6dae0; }
.demo-dots i:first-child { background: rgba(255, 92, 124, 0.55); }
.demo-url {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: #5b6472;
  background: #fff;
  border: 1px solid #e5e8ec;
  border-radius: var(--radius-pill);
  padding: 5px 14px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.demo-navbar {
  height: 2px; width: 0;
  background: var(--gradient-primary);
  transition: width 0.9s cubic-bezier(0.2, 0.9, 0.25, 1), opacity 0.4s ease 0.1s;
}
.demo-device.frame-nav .demo-navbar { width: 68%; }
.demo-device.frame-render .demo-navbar { width: 100%; opacity: 0; }
.demo-frames { position: relative; height: clamp(430px, 60vh, 620px); background: #fff; }
.demo-frames iframe {
  position: absolute; inset: 0; width: 100%; height: 100%; border: 0;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}
#demoView { opacity: 0; visibility: hidden; }
.demo-device.frame-render #demoView { opacity: 1; visibility: visible; }
.demo-device.frame-render #demoApp { opacity: 0; visibility: hidden; }
.demo-cursor {
  position: absolute; left: 0; top: 0; z-index: 6;
  pointer-events: none;
  transform: translate(-999px, -999px);
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.3));
}
.demo-ripple {
  position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px;
  border-radius: 50%; pointer-events: none; z-index: 5;
  background: rgba(255, 92, 124, 0.35);
  animation: demo-ripple 0.55s ease-out forwards;
}
@keyframes demo-ripple {
  from { transform: scale(0.3); opacity: 0.9; }
  to { transform: scale(2.2); opacity: 0; }
}
.demo-press { transform: scale(0.97); filter: brightness(0.96); transition: transform 0.12s ease, filter 0.12s ease; }

/* ---------- captions & steps ---------- */
.demo-caption {
  position: absolute; left: clamp(12px, 2.6vw, 26px); bottom: clamp(12px, 2.6vw, 26px);
  max-width: 320px;
  padding: var(--space-4) var(--space-5);
  border-radius: 14px;
  background: var(--color-bg);
  background: color-mix(in srgb, var(--color-bg) 86%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-hairline);
  z-index: 7;
}
.demo-caption .cap-num {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: var(--color-text-secondary);
}
.demo-caption h2 { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; margin: 6px 0 4px; }
.demo-caption p { font-size: 13px; line-height: 1.6; color: var(--color-text-secondary); margin: 0; }
.demo-steps {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
  margin: var(--space-6) 0 var(--space-4);
}
.demo-steps [data-step] {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; letter-spacing: 0.02em;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline);
  background: transparent;
  border-radius: var(--radius-pill);
  padding: 7px 14px;
  transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
}
.demo-steps [data-step].active {
  color: var(--color-text);
  border-color: var(--color-hairline-strong);
  background: rgba(255,255,255,0.05);
}
.demo-note {
  text-align: center; max-width: 620px; margin: var(--space-4) auto 0;
  font-size: 13px; line-height: 1.7; color: var(--color-text-secondary);
}
.demo-mcp {
  max-height: 0; opacity: 0; overflow: hidden;
  margin-top: var(--space-5);
  border: 1px solid var(--color-hairline-strong);
  border-radius: 14px;
  background: rgba(92, 225, 212, 0.04);
  transition: max-height 0.6s ease, opacity 0.5s ease, padding 0.4s ease;
  padding: 0 var(--space-5);
}
.demo-mcp.show {
  max-height: 420px; opacity: 1;
  padding: var(--space-4) var(--space-5);
}
.demo-mcp-head {
  display: flex; align-items: center; gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
}
.demo-mcp-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #5ce1d4; box-shadow: 0 0 8px rgba(92, 225, 212, 0.8);
}
.demo-mcp-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);
}
.demo-mcp-label {
  display: block;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--color-text-secondary); margin-bottom: 6px;
}
.demo-mcp pre {
  margin: 0; padding: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--color-hairline);
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px; line-height: 1.65;
  color: var(--color-text);
  white-space: pre-wrap; word-break: break-all;
  max-height: 200px; overflow: auto;
}
.demo-mcp-link {
  margin-top: var(--space-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.demo-mcp-link code {
  color: #5ce1d4;
  padding: 3px 10px;
  border: 1px dashed rgba(92, 225, 212, 0.4);
  border-radius: var(--radius-pill);
}
@media (max-width: 720px) {
  .demo-mcp-grid { grid-template-columns: 1fr; }
}
.demo-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: var(--space-5); }
.demo-actions .btn { min-width: 160px; }
@media (max-width: 720px) {
  .demo-caption { position: static; max-width: none; margin: 0 0 clamp(12px, 2.6vw, 26px); }
  .demo-frames { height: 400px; }
}
@media (prefers-reduced-motion: reduce) {
  .demo-device, .demo-frames iframe, .demo-navbar { transition: none !important; }
}
</style>
</head>
<body>
${renderNav(
  lang,
  '/demo',
  `<a class="account-button" href="/">${lang === 'zh' ? '回到上传' : 'Back to app'}</a>`
)}
<main class="demo-main">
  <header class="demo-hero">
    <span class="demo-eyebrow">${esc(t.eyebrow)}</span>
    <h1>${esc(t.h1a)}<em>${esc(t.h1b)}</em></h1>
    <p>${esc(t.sub)}</p>
  </header>

  <div class="demo-steps">
    <button type="button" data-step="0" class="active">01 · ${esc(t.step1)}</button>
    <button type="button" data-step="1">02 · ${esc(t.step2)}</button>
    <button type="button" data-step="2">03 · ${esc(t.step3)}</button>
    <button type="button" data-step="3">04 · ${esc(t.step4)}</button>
  </div>

  <section class="demo-stage" id="stage" data-url="${esc(t.demoUrl)}" data-err="${esc(t.errRate)}" data-demo-err="${esc(t.errDemo)}" data-demo-limited="${limited ? '1' : '0'}">
    <div class="demo-stage-grid"></div>
    <div class="demo-device frame-editor" id="demoDevice">
      <div class="demo-chrome">
        <div class="demo-dots"><i></i><i></i><i></i></div>
        <div class="demo-url" id="demoUrl">${esc(t.demoUrl)}</div>
      </div>
      <div class="demo-navbar"></div>
      <div class="demo-frames" id="demoFrames">
        <iframe id="demoApp" src="/" title="Oh My Share"></iframe>
        <iframe id="demoView" title="Shared page"></iframe>
        <div class="demo-cursor" id="demoCursor">${CURSOR_SVG}</div>
      </div>
    </div>
    <div class="demo-caption" id="demoCaption"></div>
  </section>

  <p class="demo-note">${esc(t.note)}</p>

  <div class="demo-mcp" id="demoMcp">
    <div class="demo-mcp-head">
      <span class="demo-mcp-dot"></span>${esc(t.mcpTitle)}
    </div>
    <div class="demo-mcp-grid">
      <div>
        <span class="demo-mcp-label">${esc(t.mcpReq)}</span>
        <pre id="demoMcpReq"></pre>
      </div>
      <div>
        <span class="demo-mcp-label">${esc(t.mcpRes)}</span>
        <pre id="demoMcpRes"></pre>
      </div>
    </div>
    <div class="demo-mcp-link"><span class="demo-mcp-label">${esc(t.mcpPublished)}</span> <code id="demoMcpLink"></code></div>
  </div>

  <div class="demo-actions">
    <a class="btn" href="/">${esc(t.ctaPrimary)}</a>
    <button type="button" class="btn" id="demoReplay" style="background:rgba(255,255,255,0.05);border:1px solid var(--color-hairline-strong);color:var(--color-text)">${esc(t.replay)}</button>
    <a class="btn" href="/auth.md" style="background:rgba(255,255,255,0.05);border:1px solid var(--color-hairline-strong);color:var(--color-text)">${esc(t.ctaSecondary)}</a>
  </div>

  <div hidden>
    <span data-caption="0" data-title="${esc(t.step1)}" data-desc="${esc(t.step1d)}"></span>
    <span data-caption="1" data-title="${esc(t.step2)}" data-desc="${esc(t.step2d)}"></span>
    <span data-caption="2" data-title="${esc(t.step3)}" data-desc="${esc(t.step3d)}"></span>
    <span data-caption="3" data-title="${esc(t.step4)}" data-desc="${esc(t.step4d)}"></span>
  </div>
</main>
${renderFooter(lang)}
<script>${STAGE_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400',
      Vary: 'Accept-Language, Cookie',
    },
  });
}
