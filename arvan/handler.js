import { proxy, pagesOrigin } from '../gateway/proxy.mjs';

// The existing store retains all order IDs, owner hashes and admin capabilities.
// Only this fixed, validated API is forwarded; it is never an arbitrary URL proxy.
export function createArvanHandler(html, forward = proxy) {
  return async request => {
    const url = new URL(request.url), origin = request.headers.get('origin');
    const json = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
    if (origin && origin !== url.origin) return json('درخواست معتبر نیست.', 403);
    if (url.pathname.startsWith('/api/')) {
      let body;
      if (!['GET', 'HEAD'].includes(request.method)) {
        const reader = request.body?.getReader(), chunks = []; let size = 0;
        if (reader) for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 24000) { await reader.cancel(); return json('حجم سفارش بیش از حد مجاز است.', 413); }
          chunks.push(value);
        }
        body = new Uint8Array(size); let position = 0;
        for (const chunk of chunks) { body.set(chunk, position); position += chunk.byteLength; }
      }
      const headers = new Headers({ origin: pagesOrigin });
      for (const name of ['content-type','access-control-request-method','access-control-request-headers']) {
        const value = request.headers.get(name); if (value) headers.set(name, value);
      }
      // Authenticate the public origin here; the fixed internal hop uses the
      // existing trusted gateway origin. No owner/admin token is changed.
      const response = await forward(new Request('https://gateway.internal' + url.pathname + url.search, { method: request.method, headers, ...(body ? { body } : {}) }));
      const outgoing = new Headers(response.headers);
      outgoing.delete('access-control-allow-origin');
      if (origin) outgoing.set('access-control-allow-origin', origin);
      return new Response(response.body, { status: response.status, headers: outgoing });
    }
    if (!['/', '/index.html'].includes(url.pathname) || !['GET','HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
  };
}
