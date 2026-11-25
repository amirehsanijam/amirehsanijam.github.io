import test from 'node:test';import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{readFileSync}from'node:fs';import{api}from'../worker/api.js';import{makeDB}from'../scripts/local-api.mjs';import menu from'../src/menu.json'with{type:'json'};
test('group creator is admin; customers manage only owned orders; reset is scoped and legacy survives',async()=>{
const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_group_orders.sql','utf8'));const env={DB:makeDB(db)};
const call=async(method,path,body)=>{const r=await api(new Request('https://test.example/api/'+path,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return{status:r.status,body:await r.json()}};
const a=crypto.randomUUID(),b=crypto.randomUUID(),admin='a'.repeat(64),owner='b'.repeat(64),other='c'.repeat(64);
const order=()=>({id:crypto.randomUUID(),token:owner,name:'Customer',items:[{id:menu.items[0].id,quantity:1}]});
try{
assert.equal((await call('POST','groups',{id:a,adminToken:admin,title:'A'})).status,200);
assert.equal((await call('POST','groups',{id:a,adminToken:other,title:'Hijack'})).status,403);
await call('POST','groups',{id:b,adminToken:other,title:'B'});
const legacy=order(),mine=order(),theirs=order();theirs.token=other;
await call('POST','orders',legacy);await call('POST',`groups/${a}/orders`,mine);await call('POST',`groups/${a}/orders`,theirs);
assert.equal((await call('POST',`groups/${a}/admin`,{adminToken:other})).status,403);
assert.equal((await call('POST',`groups/${a}/admin`,{adminToken:admin})).status,200);
let list=(await call('GET',`groups/${a}/orders`)).body;assert.equal(list.orders.length,2);assert.equal(JSON.stringify(list).includes(admin),false);assert.equal(JSON.stringify(list).includes('admin_hash'),false);
assert.equal((await call('POST',`groups/${a}/orders`,{...mine,token:other})).status,403);
assert.equal((await call('POST',`groups/${b}/orders`,{...mine,adminToken:other})).status,403);
assert.equal((await call('DELETE',`groups/${a}/orders/${mine.id}`,{token:other})).status,403);
assert.equal((await call('POST',`groups/${a}/orders`,{...theirs,token:owner,adminToken:admin,items:[{id:menu.items[0].id,quantity:2}]})).status,200);
assert.equal((await call('POST',`groups/${a}/orders`,{...theirs,items:[{id:menu.items[0].id,quantity:3}]})).status,200,'admin edit preserves original owner');
assert.equal((await call('DELETE',`groups/${b}/orders/${mine.id}`,{adminToken:other})).status,403);
assert.equal((await call('DELETE',`groups/${a}/orders/${mine.id}`,{adminToken:admin})).status,200);
assert.equal((await call('DELETE',`groups/${a}/orders`,{token:owner})).status,403);
assert.equal((await call('DELETE',`groups/${a}/orders`,{adminToken:admin})).status,200);
assert.equal((await call('GET',`groups/${a}/orders`)).body.orders.length,0);
assert.equal((await call('POST',`groups/${a}/orders`,theirs)).status,403,'stale editor cannot revive reset orders');
assert.equal((await call('GET','orders')).body.orders.length,1,'legacy unaffected');
assert.equal((await call('POST',`groups/${a}/orders`,order())).status,200,'same invite accepts new orders after reset');
}finally{db.close()}
});
