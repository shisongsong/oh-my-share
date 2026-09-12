import { handleHome } from './handlers/home.js';
import { handleUpload } from './handlers/upload.js';
import { handlePublicContent, handleView } from './handlers/view.js';
import {
  handleCurrentUser,
  handleLogin,
  handleLogout,
  handleRegister,
} from './handlers/auth.js';
import { handleDeleteAsset, handleListAssets } from './handlers/assets.js';
import { applySecurityHeaders, json } from './security.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    try {
      if (request.method === 'POST' && url.pathname === '/api/upload') {
        response = await handleUpload(request, env);
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
      } else if (request.method === 'DELETE' && url.pathname.startsWith('/api/assets/')) {
        try {
          const id = decodeURIComponent(url.pathname.slice('/api/assets/'.length));
          response = await handleDeleteAsset(request, env, id);
        } catch {
          response = json({ error: 'Invalid ID' }, 400);
        }
      } else if (request.method === 'GET' && url.pathname.startsWith('/api/content/')) {
        response = await handlePublicContent(request, env);
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
