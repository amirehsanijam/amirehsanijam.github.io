import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api } from '../worker/api.js';
import { makeDB } from '../scripts/local-api.mjs';
import menu from '../src/menu.json' with {type:'json'};
const token='a'.repeat(64), other='b'.repeat(64);
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_group_orders.sql',import.meta.url),'utf8'));return{db,env:{DB:makeDB(db)}}}
function call(env,method,body,path='/api/orders'){return api(new Request('https://order.test'+path,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env)}
function order(){return{id:crypto.randomUUID(),token,name:'کاربر آزمایشی',note:'بدون یخ',items:[{id:menu.items[0].id,quantity:2,price:1}]}}
test('uses menu prices, persists a retry once, updates by owner and excludes credentials from shared records',async()=>{
 const {db,env}=setup();try{const o=order();assert.equal((await call(env,'POST',o)).status,200);assert.equal((await call(env,'POST',o)).status,200);let shared=await(await call(env,'GET')).json();assert.equal(shared.orders.length,1);assert.equal(shared.orders[0].total,menu.items[0].price*2);assert.equal(shared.orders[0].token,undefined);assert.equal(shared.orders[0].token_hash,undefined);o.items[0].quantity=3;await call(env,'POST',o);shared=await(await call(env,'GET')).json();assert.equal(shared.orders[0].total,menu.items[0].price*3);}finally{db.close()}
});
test('prevents another visitor from overwriting or cancelling an order',async()=>{const{db,env}=setup();try{const o=order();await call(env,'POST',o);assert.equal((await call(env,'POST',{...o,token:other,name:'شخص دیگر'})).status,403);assert.equal((await call(env,'DELETE',{token:other},'/api/orders/'+o.id)).status,403);assert.equal((await(await call(env,'GET')).json()).orders[0].name,o.name);assert.equal((await call(env,'DELETE',{token},'/api/orders/'+o.id)).status,200);assert.equal((await(await call(env,'GET')).json()).orders.length,0);}finally{db.close()}});
test('rejects missing, unknown, duplicate or invalid quantities before writing',async()=>{const{db,env}=setup();try{for(const items of [[],[{id:'missing',quantity:1}],[{id:menu.items[0].id,quantity:0}],[{id:menu.items[0].id,quantity:21}],[{id:menu.items[0].id,quantity:1.5}],[{id:menu.items[0].id,quantity:1},{id:menu.items[0].id,quantity:1}]])assert.equal((await call(env,'POST',{...order(),items})).status,400);assert.equal((await(await call(env,'GET')).json()).orders.length,0);}finally{db.close()}});
test('blocks cross-origin writes and reports unavailable durable storage',async()=>{const{db,env}=setup();try{const r=await api(new Request('https://order.test/api/orders',{method:'POST',headers:{'content-type':'application/json',origin:'https://elsewhere.test'},body:JSON.stringify(order())}),env);assert.equal(r.status,403);assert.equal((await call({},'GET')).status,503);}finally{db.close()}});
test('a stale editor cannot restore a deleted order or change another person order',async()=>{const{db,env}=setup();try{const mine=order(),theirs={...order(),token:other,name:'شخص دیگر'};await call(env,'POST',mine);await call(env,'POST',theirs);await call(env,'DELETE',{token},'/api/orders/'+mine.id);assert.equal((await call(env,'POST',{...mine,items:[{id:menu.items[0].id,quantity:5}]})).status,403);const active=(await(await call(env,'GET')).json()).orders;assert.equal(active.length,1);assert.equal(active[0].id,theirs.id);assert.equal(active[0].total,menu.items[0].price*2);}finally{db.close()}});

test('allows the configured Pages origin to read, create, edit and delete with CORS preflights', async () => {
 const { db, env } = setup();
 env.ALLOWED_ORIGINS = 'https://someone.github.io';
 const origin = env.ALLOWED_ORIGINS;
 const request = (method, body, path = '/api/orders') => api(new Request('https://order.test' + path, { method, headers: { origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
 try {
  for (const method of ['POST', 'DELETE']) {
   const r = await api(new Request('https://order.test/api/orders', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': method, 'access-control-request-headers': 'content-type' } }), env);
   assert.equal(r.status, 204);
   assert.equal(r.headers.get('access-control-allow-origin'), origin);
   assert.ok(r.headers.get('access-control-allow-methods').includes(method));
  }
  const o = order();
  for (const quantity of [1, 3]) {
   o.items[0].quantity = quantity;
   const r = await request('POST', o);
   assert.equal(r.status, 200);
   assert.equal(r.headers.get('access-control-allow-origin'), origin);
  }
  const shared = await request('GET');
  assert.equal(shared.headers.get('vary'), 'Origin');
  assert.equal((await shared.json()).orders[0].total, menu.items[0].price * 3);
  assert.equal((await request('DELETE', { token }, '/api/orders/' + o.id)).status, 200);
  assert.equal((await (await request('GET')).json()).orders.length, 0);
 } finally { db.close(); }
});

test('CORS only trusts exact configured origins and returns readable storage errors to that origin', async () => {
 const { db, env } = setup(); env.ALLOWED_ORIGINS = 'https://someone.github.io';
 try {
  for (const origin of ['https://someone.github.io.evil.test', 'https://other.github.io', 'null']) {
   for (const method of ['GET', 'POST', 'OPTIONS']) {
    const r = await api(new Request('https://order.test/api/orders', { method, headers: { origin, 'access-control-request-method': 'POST', 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(order()) } : {}) }), env);
    assert.equal(r.status, 403);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
   }
  }
  const r = await api(new Request('https://order.test/api/orders', { headers: { origin: env.ALLOWED_ORIGINS } }), { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS });
  assert.equal(r.status, 503);
  assert.equal(r.headers.get('access-control-allow-origin'), env.ALLOWED_ORIGINS);
 } finally { db.close(); }
});
