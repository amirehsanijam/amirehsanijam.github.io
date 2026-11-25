import assert from 'node:assert/strict';
import menu from '../src/menu.json' with { type: 'json' };

const origin = 'https://bonice-order-gateway.onrender.com';
const pages = 'https://amirehsanijam.github.io';
const fixture = { id: crypto.randomUUID(), token: crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''), name: 'Public order regression test', note: '', items: [{ id: menu.items[0].id, quantity: 1 }] };
async function call(method, path = '/api/orders', body) {
  const response = await fetch(origin + path, { method, headers: { Origin: pages, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000), cache: 'no-store' });
  assert.equal(response.headers.get('access-control-allow-origin'), pages, `${method}: exact Pages CORS origin`);
  assert.ok(response.headers.get('content-type')?.includes('application/json'), `${method}: JSON response`);
  return { status: response.status, body: await response.json() };
}
const before = await call('GET'); assert.equal(before.status, 200); assert.ok(Array.isArray(before.body.orders));
console.log(JSON.stringify({ read: 200, existingOrders: before.body.orders.length }));
try {
  const created = await call('POST', '/api/orders', fixture); assert.equal(created.status, 200);
  let shared = await call('GET');
  let order = shared.body.orders.find(o => o.id === fixture.id);
  assert.equal(order?.total, menu.items[0].price); assert.equal(order.token, undefined);
  const updated = await call('POST', '/api/orders', { ...fixture, note: 'Updated fixture', items: [{ id: menu.items[0].id, quantity: 2 }] }); assert.equal(updated.status, 200);
  shared = await call('GET'); order = shared.body.orders.find(o => o.id === fixture.id);
  assert.equal(order?.total, menu.items[0].price * 2); assert.equal(order.note, 'Updated fixture');
  const denied = await call('DELETE', '/api/orders/' + fixture.id, { token: '0'.repeat(64) }); assert.equal(denied.status, 403);
  console.log(JSON.stringify({ create: 200, edit: 200, unauthorizedDelete: 403 }));
} finally {
  const removed = await call('DELETE', '/api/orders/' + fixture.id, { token: fixture.token });
  assert.ok([200, 403].includes(removed.status), 'Temporary fixture cleanup');
  const after = await call('GET'); assert.equal(after.status, 200);
  assert.equal(after.body.orders.some(o => o.id === fixture.id), false);
  const sort = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(sort(after.body.orders), sort(before.body.orders), 'Existing orders remain unchanged');
  console.log(JSON.stringify({ testOrderRemoved: true, existingOrdersUnchanged: true }));
}

const group=crypto.randomUUID(),admin=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const prefix='/api/groups/'+group+'/orders';
assert.equal((await call('POST','/api/groups',{id:group,adminToken:admin,title:'Group role verification'})).status,200);
const customer={...fixture,id:crypto.randomUUID()};
try{
 assert.equal((await call('POST',prefix,customer)).status,200);
 assert.equal((await call('DELETE',prefix+'/'+customer.id,{token:'0'.repeat(64)})).status,403);
 assert.equal((await call('DELETE',prefix,{token:customer.token})).status,403);
 assert.equal((await call('POST',prefix,{...customer,token:'0'.repeat(64),adminToken:admin,note:'Admin edited'})).status,200);
 assert.equal((await call('GET',prefix)).body.orders[0].note,'Admin edited');
 assert.equal((await call('POST',prefix,{...customer,note:'Owner retained'})).status,200);
 assert.equal((await call('DELETE',prefix+'/'+customer.id,{adminToken:admin})).status,200);
 assert.equal((await call('POST',prefix,{...customer,id:crypto.randomUUID()})).status,200);
}finally{
 assert.equal((await call('DELETE',prefix,{adminToken:admin})).status,200);
 assert.equal((await call('GET',prefix)).body.orders.length,0);
 const after=await call('GET');assert.deepEqual(after.body.orders,before.body.orders,'Legacy orders preserved through group reset');
}
console.log(JSON.stringify({groupCreator:true,customerOwnership:true,adminEditDeleteReset:true,legacyOrdersUnchanged:true}));
