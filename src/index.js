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
import { handleDeleteAsset, handleListAssets, handlePublishAsset } from './handlers/assets.js';
import {
  handleGalleryPage,
  handleGalleryItem,
  handleGalleryApi,
  handleRemixPage,
} from './handlers/gallery.js';
import { handleAbusePage, handleReportSubmit } from './handlers/report.js';
import { handleRobotsTxt, handleSitemap, notFoundPage } from './handlers/seo.js';
import { handleLegalPage } from './handlers/legal.js';
import { handleFeed } from './handlers/feed.js';
import { handleStaticAssets } from './handlers/static.js';
import { handleStats, handleReport } from './handlers/stats.js';
import { handleEditPage, handleManagePage, handleEditSave } from './handlers/manage.js';
import { handleApiCatalog } from './handlers/api-catalog.js';
import { handleAuthMd } from './handlers/auth-md.js';
import { handleLlmsTxt } from './handlers/llms-txt.js';
import { handleOAuthProtectedResource } from './handlers/oauth-metadata.js';
import { handleOAuthAuthorizationServer } from './handlers/oauth-auth-server.js';
import { handleAgentCard } from './handlers/agent-card.js';
import { handleA2a } from './handlers/a2a.js';
import { handleAgentSkillsIndex } from './handlers/agent-skills.js';
import { handleMcpServerCard } from './handlers/mcp-server-card.js';
import { handleMcp } from './handlers/mcp.js';
import { handleOAuthToken, handleOAuthAuthorize, handleOAuthLogin, handleOAuthCallback } from './handlers/oauth-token.js';
import { handleGoogleAuth, handleGoogleCallback, handleGitHubAuth, handleGitHubCallback } from './handlers/oauth-social.js';
import { handleHttpMessageSignaturesDirectory } from './handlers/http-message-signatures.js';
import { handleLandingPage } from './handlers/landing.js';
import { applySecurityHeaders, json } from './security.js';
import { resolveLang } from './i18n.js';
import { runDailyMonitor } from './handlers/monitor.js';
import { recordPageView } from './handlers/traffic.js';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#ff5c7c"/><stop offset="1" stop-color="#5ce1d4"/>
</linearGradient></defs>
<rect width="64" height="64" rx="15" fill="url(#g)"/>
<circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="7"/>
<circle cx="45" cy="19" r="6.5" fill="#fff"/>
</svg>`;

export default {
  // 每日定时任务 - 收集分析数据
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyMonitor(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let response;

    // HEAD must behave like GET (same status + headers, no body). Routers
    // gate HTML/API routes on GET, which used to make every HEAD 404.
    const isHead = request.method === 'HEAD';
    if (isHead) {
      request = new Request(request.url, { method: 'GET', headers: request.headers });
    }

    try {
      if (url.pathname === '/.well-known/api-catalog') {
        response = handleApiCatalog(request);
      } else if (url.pathname === '/.well-known/oauth-protected-resource') {
        response = handleOAuthProtectedResource(request);
      } else if (url.pathname === '/.well-known/oauth-authorization-server') {
        response = handleOAuthAuthorizationServer(request);
      } else if (url.pathname === '/.well-known/agent-card.json') {
        response = handleAgentCard(request);
      } else if (url.pathname === '/a2a') {
        response = await handleA2a(request, env);
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
      } else if (url.pathname === '/llms.txt') {
        response = handleLlmsTxt(request);
      } else if (url.pathname === '/terms') {
        response = handleLegalPage('terms', request);
      } else if (url.pathname === '/privacy') {
        response = handleLegalPage('privacy', request);
      } else if (url.pathname === '/feed.xml') {
        response = await handleFeed(request, env);
      } else if (['/html-viewer', '/code-share', '/codepen-alternative', '/ai-html-publish', '/chatgpt-html-share'].includes(url.pathname)) {
        response = handleLandingPage(url.pathname, resolveLang(request));
      } else if (url.pathname === '/dab46c9c750b7c083d5723b8ed9653a5.txt') {
        response = new Response('dab46c9c750b7c083d5723b8ed9653a5', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      } else if (url.pathname === '/robots.txt') {
        response = handleRobotsTxt();
      } else if (url.pathname === '/sitemap.xml') {
        response = await handleSitemap(env);
      } else if (url.pathname === '/extension.zip') {
        response = await env.MY_BUCKET.get('extension.zip');
        if (!response) {
          response = new Response('Not Found', { status: 404 });
        } else {
          response = new Response(response.body, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': 'attachment; filename="oh-my-share-extension.zip"',
            },
          });
        }
      } else if (url.pathname === '/icon.svg') {
        response = new Response(ICON_SVG, {
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
        });
      } else if (url.pathname === '/favicon.ico') {
        response = new Response(ICON_SVG, {
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
        });
      } else if (url.pathname === '/og-image.png') {
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
      } else if (request.method === 'POST' && url.pathname.startsWith('/api/assets/') && url.pathname.endsWith('/publish')) {
        const rawId = url.pathname.slice('/api/assets/'.length, -'/publish'.length);
        let id = rawId;
        try {
          id = decodeURIComponent(rawId);
        } catch {
          id = '';
        }
        try {
          response = await handlePublishAsset(request, env, id);
        } catch (error) {
          console.error('Publish asset route error:', error);
          response = json({ error: 'Publish failed', code: 'errPublishFailed' }, 503, {
            'Cache-Control': 'no-store',
          });
        }
      } else if (request.method === 'GET' && url.pathname === '/gallery') {
        response = await handleGalleryPage(request, env);
      } else if (request.method === 'GET' && url.pathname.startsWith('/gallery/')) {
        response = await handleGalleryItem(request, env, url.pathname.slice('/gallery/'.length));
      } else if (request.method === 'GET' && url.pathname.startsWith('/remix/')) {
        response = await handleRemixPage(request, env, url.pathname.slice('/remix/'.length));
      } else if (request.method === 'GET' && url.pathname === '/api/gallery') {
        response = await handleGalleryApi(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/report') {
        response = await handleReportSubmit(request, env);
      } else if (request.method === 'GET' && url.pathname === '/abuse') {
        response = await handleAbusePage(request, env);
      } else if (request.method === 'GET' && url.pathname === '/api/shares') {
        response = await handleListShares(request, env);
      } else if (request.method === 'DELETE' && url.pathname.startsWith('/api/assets/')) {
        const rawId = url.pathname.slice('/api/assets/'.length);
        let id = rawId;
        try {
          id = decodeURIComponent(rawId);
        } catch {
          id = '';
        }
        try {
          response = await handleDeleteAsset(request, env, id);
        } catch (error) {
          console.error('Delete asset route error:', error);
          response = json({ error: 'Delete failed', code: 'errDeleteFailed' }, 503, {
            'Cache-Control': 'no-store',
          });
        }
      } else if (request.method === 'GET' && url.pathname.startsWith('/api/content/')) {
        response = await handlePublicContent(request, env);
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
        response = new Response(notFoundPage(resolveLang(request)), {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex',
          },
        });
      }
    } catch (error) {
      console.error('Unhandled error:', error);
      response = json({ error: 'Internal error', code: 'errInternal' }, 500);
    }

    const finalResponse = applySecurityHeaders(response);

    if (isHead) {
      return new Response(null, {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: finalResponse.headers,
      });
    }

    const tracked = recordPageView(request, env, finalResponse);
    if (tracked && ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(tracked);
    }

    return finalResponse;
  },
};
