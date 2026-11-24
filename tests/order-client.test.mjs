import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderAPI, createOrderSync } from '../src/order-client.js';

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
test('slow reads finish even when several poll intervals elapse', async () => {
  const pending = deferred(), displayed = []; let calls = 0, loaded = false;
  const sync = createOrderSync({ read: () => { calls++; return pending.promise; }, onOrders: rows => displayed.push(rows), onConnection() {}, onError() {}, onLoaded() { loaded = true; } });
  const first = sync.refresh();
  for (let interval = 0; interval < 5; interval++) assert.equal(sync.refresh(), first);
  await Promise.resolve(); assert.equal(calls, 1);
  pending.resolve({ orders: [{ id: 'saved' }] }); await first;
  assert.deepEqual(displayed, [[{ id: 'saved' }]]); assert.equal(loaded, true);
});
test('an old read cannot restore a deleted order or overwrite a saved edit', async () => {
  const old = deferred(), fresh = deferred(), displayed = []; let calls = 0;
  const sync = createOrderSync({ read: () => (++calls === 1 ? old.promise : fresh.promise), onOrders: rows => displayed.push(rows), onConnection() {}, onError() {}, onLoaded() {} });
  const beforeWrite = sync.refresh(); await Promise.resolve();
  sync.invalidate(); const afterWrite = sync.refresh(); await Promise.resolve();
  fresh.resolve({ orders: [{ id: 'edited', total: 234000 }] }); await afterWrite;
  old.resolve({ orders: [{ id: 'deleted' }, { id: 'edited', total: 117000 }] }); await beforeWrite;
  assert.deepEqual(displayed, [[{ id: 'edited', total: 234000 }]]);
});
test('read failures retain existing orders and allow a new retry', async () => {
  let calls = 0; const connections = [], errors = [], displayed = [];
  const sync = createOrderSync({ read: async () => { if (++calls === 1) throw Error('unreachable'); return { orders: [] }; }, onOrders: rows => displayed.push(rows), onConnection: value => connections.push(value), onError: value => errors.push(value), onLoaded() {} });
  await sync.refresh(); assert.deepEqual(displayed, []);
  await sync.refresh(); assert.deepEqual(connections, [false, true]); assert.deepEqual(errors, ['unreachable', '']); assert.deepEqual(displayed, [[]]);
});
test('timeouts release a pending write without an automatic duplicate request', async () => {
  let calls = 0;
  const api = createOrderAPI('https://gateway.test', async (_url, { signal }) => {
    calls++; return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  }, 5);
  await assert.rejects(api('/api/orders', { method: 'POST', body: '{}' }), /پاسخ سرور طول کشید/);
  assert.equal(calls, 1);
});
test('filtered HTML and browser network errors produce a useful Persian retry message', async () => {
  for (const fetchRequest of [async () => new Response('<html>Blocked</html>', { status: 403 }), async () => { throw new TypeError('Load failed'); }]) {
    await assert.rejects(createOrderAPI('', fetchRequest)('/api/orders'), /انتخاب‌های شما حفظ شده‌اند/);
  }
});
test('ownership errors stay intact and private write bodies are forwarded unchanged', async () => {
  const body = JSON.stringify({ token: 'a'.repeat(64) });
  const api = createOrderAPI('https://gateway.test', async (url, options) => {
    assert.equal(url, 'https://gateway.test/api/orders'); assert.equal(options.body, body); assert.equal(options.cache, 'no-store');
    return Response.json({ error: 'اجازه تغییر ندارید.' }, { status: 403 });
  });
  await assert.rejects(api('/api/orders', { method: 'POST', body }), /اجازه تغییر ندارید/);
});
