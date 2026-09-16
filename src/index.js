import { handleHome } from './handlers/home.js';
import { handleUpload } from './handlers/upload.js';
import { handlePublicContent, handleView, handleVerifyPassword } from './handlers/view.js';
import {
  handleCurrentUser,
  handleLogin,
  handleLogout,
  handleRegister,
  handleListShares,
} from './handlers/auth.js';
import { handleDeleteAsset, handleListAssets } from './handlers/assets.js';
import { handleRobotsTxt, handleSitemap } from './handlers/seo.js';
import { handleStaticAssets } from './handlers/static.js';
import { handleStats, handleReport } from './handlers/stats.js';
import { handleEditPage, handleManagePage, handleEditSave } from './handlers/manage.js';
import { handleApiCatalog } from './handlers/api-catalog.js';
import { handleAuthMd } from './handlers/auth-md.js';
import { handleOAuthProtectedResource } from './handlers/oauth-metadata.js';
import { handleOAuthAuthorizationServer } from './handlers/oauth-auth-server.js';
import { handleAgentCard } from './handlers/agent-card.js';
import { handleAgentSkillsIndex } from './handlers/agent-skills.js';
import { handleMcpServerCard } from './handlers/mcp-server-card.js';
import { handleMcp } from './handlers/mcp.js';
import { handleOAuthToken, handleOAuthAuthorize, handleOAuthLogin, handleOAuthCallback } from './handlers/oauth-token.js';
import { handleGoogleAuth, handleGoogleCallback, handleGitHubAuth, handleGitHubCallback } from './handlers/oauth-social.js';
import { handleHttpMessageSignaturesDirectory } from './handlers/http-message-signatures.js';
import { applySecurityHeaders, json } from './security.js';

async function handlePrivacyPolicy(request) {
  const privacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f0; color: #1a1a1a; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2rem; margin-bottom: 2rem; background: linear-gradient(90deg, #ff5c7c, #5ce1d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 1.25rem; margin: 2rem 0 1rem; color: #1a1a1a; }
    p { margin-bottom: 1rem; }
    ul { margin: 1rem 0; padding-left: 2rem; }
    li { margin-bottom: 0.5rem; }
    .last-updated { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last updated: September 2026</p>
    
    <h2>Introduction</h2>
    <p>Oh My Share ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our HTML and code sharing service.</p>
    
    <h2>Information We Collect</h2>
    <p>When you use Oh My Share, we collect:</p>
    <ul>
      <li><strong>Content you upload:</strong> HTML files and code snippets you choose to share</li>
      <li><strong>Account information:</strong> Email address (if you create an account)</li>
      <li><strong>Usage data:</strong> Basic analytics to improve our service</li>
    </ul>
    
    <h2>How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
      <li>Provide and maintain the sharing service</li>
      <li>Authenticate your identity</li>
      <li>Improve user experience</li>
      <li>Communicate with you about your account</li>
    </ul>
    
    <h2>Data Storage</h2>
    <p>Your uploaded content is stored securely using Cloudflare's infrastructure. Content is encrypted at rest and in transit.</p>
    
    <h2>Data Sharing</h2>
    <p>We do not sell or share your personal information with third parties, except as required by law.</p>
    
    <h2>Your Rights</h2>
    <p>You can:</p>
    <ul>
      <li>Access your uploaded content at any time</li>
      <li>Delete your content and account</li>
      <li>Request a copy of your data</li>
    </ul>
    
    <h2>Contact</h2>
    <p>For privacy-related inquiries, contact us at: 1400875096@qq.com</p>
  </div>
</body>
</html>`;

  return new Response(privacyHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleWidget(request, env) {
  const url = new URL(request.url);
  const widgetName = url.pathname.split('/')[2];
  
  const widgets = {
    'upload': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    h2 { margin-bottom: 16px; color: #1a1a1a; }
    textarea { width: 100%; height: 200px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-family: monospace; font-size: 14px; resize: vertical; }
    textarea:focus { outline: none; border-color: #ff5c7c; }
    .options { margin: 16px 0; display: flex; gap: 12px; }
    .options select, .options input { padding: 8px 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; }
    button { padding: 12px 24px; background: linear-gradient(90deg, #ff5c7c, #5ce1d4); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; }
    button:hover { opacity: 0.9; }
    .loading { display: none; margin-top: 12px; color: #666; }
  </style>
</head>
<body>
  <h2>Share HTML Content</h2>
  <textarea id="content" placeholder="Paste your HTML code here..."></textarea>
  <div class="options">
    <select id="language">
      <option value="html">HTML</option>
      <option value="css">CSS</option>
      <option value="js">JavaScript</option>
      <option value="markdown">Markdown</option>
    </select>
    <input type="text" id="filename" placeholder="Filename (optional)">
    <input type="password" id="password" placeholder="Password (optional)">
  </div>
  <button id="shareBtn">Share Now</button>
  <div class="loading" id="loading">Uploading...</div>
  
  <script>
    document.getElementById('shareBtn').addEventListener('click', async () => {
      const content = document.getElementById('content').value;
      const language = document.getElementById('language').value;
      const filename = document.getElementById('filename').value;
      const password = document.getElementById('password').value;
      
      if (!content.trim()) {
        alert('Please enter some content');
        return;
      }
      
      document.getElementById('loading').style.display = 'block';
      
      try {
        const result = await window.openai.callTool('upload', {
          content,
          language,
          filename: filename || undefined,
          password: password || undefined,
        });
        
        if (result.error) {
          alert('Error: ' + result.error);
        } else {
          // 显示结果
          document.body.innerHTML = '<h2>Share Created!</h2><p>Your share URL:</p><input type="text" value="' + result.url + '" readonly style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;font-size:14px;"><button onclick="navigator.clipboard.writeText(this.previousElementSibling.value)" style="margin-top:12px;">Copy URL</button>';
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        document.getElementById('loading').style.display = 'none';
      }
    });
  </script>
</body>
</html>`,
    'result': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Result - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    h2 { margin-bottom: 16px; color: #1a1a1a; }
    .url-box { background: white; padding: 16px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 16px; }
    .url-box input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .actions { display: flex; gap: 12px; }
    button { padding: 12px 24px; background: linear-gradient(90deg, #ff5c7c, #5ce1d4); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
    button:hover { opacity: 0.9; }
    button.secondary { background: #f5f5f0; color: #1a1a1a; border: 2px solid #ddd; }
  </style>
</head>
<body>
  <h2>Share Created Successfully!</h2>
  <div class="url-box">
    <input type="text" id="shareUrl" readonly>
  </div>
  <div class="actions">
    <button onclick="navigator.clipboard.writeText(document.getElementById('shareUrl').value)">Copy URL</button>
    <button class="secondary" onclick="window.open(document.getElementById('shareUrl').value)">Open</button>
  </div>
  
  <script>
    window.addEventListener('openai:set_globals', () => {
      const data = window.openai.toolOutput;
      if (data && data.url) {
        document.getElementById('shareUrl').value = data.url;
      }
    });
  </script>
</body>
</html>`,
    'assets': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Shares - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    h2 { margin-bottom: 16px; color: #1a1a1a; }
    .asset-list { display: flex; flex-direction: column; gap: 12px; }
    .asset-item { background: white; padding: 16px; border: 2px solid #ddd; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .asset-info { flex: 1; }
    .asset-name { font-weight: bold; margin-bottom: 4px; }
    .asset-date { color: #666; font-size: 12px; }
    .asset-actions { display: flex; gap: 8px; }
    button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .view-btn { background: #5ce1d4; color: white; }
    .delete-btn { background: #ff5c7c; color: white; }
    .loading { color: #666; }
  </style>
</head>
<body>
  <h2>My Shares</h2>
  <div class="asset-list" id="assetList">
    <div class="loading">Loading...</div>
  </div>
  
  <script>
    async function loadAssets() {
      try {
        const result = await window.openai.callTool('list_assets', {});
        const list = document.getElementById('assetList');
        
        if (!result.assets || result.assets.length === 0) {
          list.innerHTML = '<p>No shares yet. Upload something!</p>';
          return;
        }
        
        list.innerHTML = result.assets.map(asset => '<div class="asset-item"><div class="asset-info"><div class="asset-name">' + (asset.filename || 'Untitled') + '</div><div class="asset-date">' + new Date(asset.createdAt * 1000).toLocaleDateString() + '</div></div><div class="asset-actions"><button class="view-btn" onclick="window.open(\\'' + asset.url + '\\')">View</button><button class="delete-btn" onclick="deleteAsset(\\'' + asset.id + '\\')">Delete</button></div></div>').join('');
      } catch (err) {
        document.getElementById('assetList').innerHTML = '<p>Error loading assets: ' + err.message + '</p>';
      }
    }
    
    async function deleteAsset(id) {
      if (!confirm('Are you sure you want to delete this share?')) return;
      
      try {
        await window.openai.callTool('delete', { id });
        loadAssets();
      } catch (err) {
        alert('Error deleting: ' + err.message);
      }
    }
    
    loadAssets();
  </script>
</body>
</html>`,
    'view': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>View - Oh My Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    h2 { margin-bottom: 16px; color: #1a1a1a; }
    .content-box { background: white; padding: 16px; border: 2px solid #ddd; border-radius: 8px; overflow: auto; }
    .content-box pre { white-space: pre-wrap; font-family: monospace; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Shared Content</h2>
  <div class="content-box">
    <pre id="content">Loading...</pre>
  </div>
  
  <script>
    window.addEventListener('openai:set_globals', async () => {
      const data = window.openai.toolOutput;
      if (data && data.id) {
        try {
          const result = await window.openai.callTool('view', { id: data.id });
          document.getElementById('content').textContent = result.content || 'No content';
        } catch (err) {
          document.getElementById('content').textContent = 'Error: ' + err.message;
        }
      }
    });
  </script>
</body>
</html>`,
  };
  
  const widget = widgets[widgetName];
  if (!widget) {
    return new Response('Widget not found', { status: 404 });
  }
  
  return new Response(widget, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    try {
      if (url.pathname === '/.well-known/api-catalog') {
        response = handleApiCatalog(request);
      } else if (url.pathname === '/.well-known/oauth-protected-resource') {
        response = handleOAuthProtectedResource(request);
      } else if (url.pathname === '/.well-known/oauth-authorization-server') {
        response = handleOAuthAuthorizationServer(request);
      } else if (url.pathname === '/.well-known/agent-card.json') {
        response = handleAgentCard(request);
      } else if (url.pathname === '/.well-known/agent-skills/index.json') {
        response = await handleAgentSkillsIndex(request, env);
      } else if (url.pathname === '/.well-known/mcp/server-card.json') {
        response = handleMcpServerCard(request);
      } else if (url.pathname === '/mcp') {
        response = await handleMcp(request, env);
      } else if (url.pathname === '/oauth/token') {
        response = await handleOAuthToken(request, env);
      } else if (url.pathname === '/oauth/authorize') {
        response = await handleOAuthAuthorize(request, env);
      } else if (url.pathname === '/oauth/login') {
        response = await handleOAuthLogin(request, env);
      } else if (url.pathname === '/oauth/callback') {
        response = await handleOAuthCallback(request, env);
      } else if (url.pathname === '/oauth/google') {
        response = await handleGoogleAuth(request, env);
      } else if (url.pathname === '/oauth/google/callback') {
        response = await handleGoogleCallback(request, env);
      } else if (url.pathname === '/oauth/github') {
        response = await handleGitHubAuth(request, env);
      } else if (url.pathname === '/oauth/github/callback') {
        response = await handleGitHubCallback(request, env);
      } else if (url.pathname === '/.well-known/http-message-signatures-directory') {
        response = await handleHttpMessageSignaturesDirectory(request);
      } else if (url.pathname === '/auth.md') {
        response = handleAuthMd(request);
      } else if (url.pathname === '/privacy') {
        response = handlePrivacyPolicy(request);
      } else if (url.pathname === '/robots.txt') {
        response = handleRobotsTxt();
      } else if (url.pathname === '/sitemap.xml') {
        response = handleSitemap();
      } else if (url.pathname === '/og-image.png' || url.pathname === '/favicon.ico') {
        response = await handleStaticAssets(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/upload') {
        response = await handleUpload(request, env);
      } else if (request.method === 'POST' && url.pathname.startsWith('/api/edit/')) {
        response = await handleEditSave(request, env);
      } else if (request.method === 'POST' && url.pathname.startsWith('/api/verify-password/')) {
        response = await handleVerifyPassword(request, env);
      } else if (request.method === 'GET' && url.pathname.startsWith('/api/stats/')) {
        response = await handleStats(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        response = await handleRegister(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        response = await handleLogin(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        response = await handleLogout(request, env);
      } else if (request.method === 'GET' && url.pathname === '/api/auth/me') {
        response = await handleCurrentUser(request, env);
      } else if (request.method === 'GET' && url.pathname === '/api/assets') {
        response = await handleListAssets(request, env);
      } else if (request.method === 'GET' && url.pathname === '/api/shares') {
        response = await handleListShares(request, env);
      } else if (request.method === 'DELETE' && url.pathname.startsWith('/api/assets/')) {
        try {
          const id = decodeURIComponent(url.pathname.slice('/api/assets/'.length));
          response = await handleDeleteAsset(request, env, id);
        } catch {
          response = json({ error: 'Invalid ID' }, 400);
        }
      } else if (request.method === 'GET' && url.pathname.startsWith('/api/content/')) {
        response = await handlePublicContent(request, env);
      } else if (url.pathname.startsWith('/widget/')) {
        response = await handleWidget(request, env);
      } else if (url.pathname.startsWith('/edit/')) {
        response = await handleEditPage(request, env);
      } else if (url.pathname.startsWith('/manage/')) {
        response = await handleManagePage(request, env);
      } else if (url.pathname === '/report') {
        response = await handleReport(request, env);
      } else if (request.method === 'GET' && url.pathname.startsWith('/view/')) {
        response = await handleView(request, env);
      } else if (request.method === 'GET' && url.pathname === '/') {
        response = await handleHome(request, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Unhandled error:', error);
      response = json({ error: 'Internal error' }, 500);
    }

    return applySecurityHeaders(response);
  },
};
