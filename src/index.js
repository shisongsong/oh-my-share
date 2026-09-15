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
import { applySecurityHeaders, json } from './security.js';

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
      } else if (url.pathname === '/auth.md') {
        response = handleAuthMd(request);
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
