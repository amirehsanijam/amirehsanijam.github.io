const upstreamOrigin = 'https://bonice-group-production.up.railway.app';
export const pagesOrigin = 'https://amirehsanijam.github.io';
const methods = ['GET', 'POST', 'DELETE'];
const route = /^\/api\/orders(?:\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})?$/i;

export async function proxy(request, fetchUpstream = fetch) {
  const url = new URL(request.url), origin = request.headers.get('origin');
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', vary: 'Origin', 'x-content-type-options': 'nosniff' };
  const json = (data, status) => new Response(JSON.stringify(data), { status, headers });
  if (origin && origin !== pagesOrigin) return json({ error: 'درخواست معتبر نیست.' }, 403);
  if (origin) headers['access-control-allow-origin'] = origin;
  if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, storage: 'upstream' }, 200);
  if (!(route.test(url.pathname) || /^\/api\/groups(?:\/[a-f0-9-]{36}(?:\/(?:admin|orders)(?:\/[a-f0-9-]{36})?)?)?$/.test(url.pathname)) || url.search) return json({ error: 'مسیر معتبر نیست.' }, 404);
  if (request.method === 'OPTIONS') {
    const requested = (request.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    if (!origin || !methods.includes(request.headers.get('access-control-request-method')) || requested.some(x => x !== 'content-type')) return json({ error: 'درخواست معتبر نیست.' }, 403);
    return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': methods.join(', '), 'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '600' } });
  }
  if (!methods.includes(request.method)) return json({ error: 'درخواست پشتیبانی نمی‌شود.' }, 405);
  if (request.method !== 'GET' && request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'درخواست معتبر نیست.' }, 415);
  const body = request.method === 'GET' ? undefined : new Uint8Array(await request.arrayBuffer());
  if (body && body.byteLength > 24000) return json({ error: 'حجم سفارش بیش از حد مجاز است.' }, 413);
  try {
    // Forward only the fixed order API. Ownership tokens remain in the original JSON body.
    const response = await fetchUpstream(upstreamOrigin + url.pathname, {
      method: request.method,
      headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
      ...(body ? { body } : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(20000)
    });
    if (!response.headers.get('content-type')?.includes('application/json') || response.status >= 300 && response.status < 400) return json({ error: 'ارتباط با فضای سفارش‌ها برقرار نشد. دوباره تلاش کنید.' }, 502);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return json({ error: 'ارتباط با فضای سفارش‌ها برقرار نشد. دوباره تلاش کنید.' }, 502);
  }
}
