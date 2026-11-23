import test from 'node:test';
import assert from 'node:assert/strict';
import { proxy, pagesOrigin } from '../gateway/proxy.mjs';

const id = '90c5a3fb-889f-4dc3-b4a6-4da5a4f6b3dc';
function request(method, path = '/api/orders', body) {
  return new Request('https://gateway.example' + path, { method, headers: { origin: pagesOrigin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('gateway forwards reads and private owner writes to the same existing order store', async () => {
  for (const method of ['GET', 'POST', 'DELETE']) {
    const body = { id, token: 'a'.repeat(64), items: [{ id: 'menu-item', quantity: 2 }] };
    const path = method === 'DELETE' ? '/api/orders/' + id : '/api/orders';
    const r = await proxy(request(method, path, method === 'GET' ? null : body), async (url, options) => {
      assert.equal(url, 'https://bonice-group-production.up.railway.app' + path);
      assert.equal(options.method, method);
      assert.equal(options.headers.origin, pagesOrigin);
      assert.equal(options.redirect, 'manual');
      if (method !== 'GET') assert.deepEqual(JSON.parse(new TextDecoder().decode(options.body)), body);
      return Response.json(method === 'GET' ? { orders: [] } : { ok: true });
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), pagesOrigin);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
});
test('gateway rejects other origins and arbitrary proxy paths before contacting storage', async () => {
  let calls = 0; const upstream = async () => { calls++; return Response.json({}); };
  for (const path of ['//evil.test/', '/api/other', '/api/orders?target=https://evil.test', '/api/orders/invalid']) assert.equal((await proxy(request('GET', path), upstream)).status, 404);
  const bad = new Request('https://gateway.example/api/orders', { headers: { origin: 'https://untrusted.example' } });
  const r = await proxy(bad, upstream);
  assert.equal(r.status, 403); assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal(calls, 0);
});
test('gateway supports browser write preflights without accessing order data', async () => {
  for (const method of ['POST', 'DELETE']) {
    const r = await proxy(new Request('https://gateway.example/api/orders', { method: 'OPTIONS', headers: { origin: pagesOrigin, 'access-control-request-method': method, 'access-control-request-headers': 'content-type' } }), () => { throw Error('Must not contact storage'); });
    assert.equal(r.status, 204); assert.ok(r.headers.get('access-control-allow-methods').includes(method));
  }
});
test('gateway keeps upstream ownership failures and does not treat filtered HTML or redirects as order data', async () => {
  const denied = await proxy(request('POST', '/api/orders', { token: 'bad' }), async () => Response.json({ error: 'Denied' }, { status: 403 }));
  assert.equal(denied.status, 403); assert.deepEqual(await denied.json(), { error: 'Denied' });
  for (const upstream of [async () => new Response('Blocked', { status: 403 }), async () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.example' } }), async () => { throw Error('timeout'); }]) {
    const r = await proxy(request('GET'), upstream); assert.equal(r.status, 502); assert.equal(r.headers.get('access-control-allow-origin'), pagesOrigin);
  }
});
