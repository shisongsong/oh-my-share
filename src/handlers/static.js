import { getBucket } from '../security.js';

export async function handleStaticAssets(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  const bucket = getBucket(env);
  if (!bucket) {
    return new Response('Storage not configured', { status: 500 });
  }

  const object = await bucket.get(path);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }
  
  const contentType = path.endsWith('.png') ? 'image/png' : 
                      path.endsWith('.ico') ? 'image/x-icon' : 
                      'application/octet-stream';
  
  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
