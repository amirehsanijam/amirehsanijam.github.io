import test from 'node:test';import assert from 'node:assert/strict';
import{createArvanHandler}from'../arvan/handler.js';
const origin='https://bluedoost.ir';
test('Arvan serves its bundled HTML and forwards only the fixed API with owner/admin bodies intact',async()=>{
 let calls=0;const payload={id:crypto.randomUUID(),token:'a'.repeat(64),adminToken:'b'.repeat(64)};
 const app=createArvanHandler('<html>Group ordering</html>',async request=>{
  calls++;assert.equal(request.headers.get('origin'),'https://amirehsanijam.github.io');assert.deepEqual(await request.json(),payload);
  return Response.json({ok:true},{headers:{'access-control-allow-origin':'https://amirehsanijam.github.io','cache-control':'no-store'}});
 });
 assert.equal(await(await app(new Request(origin+'/?group=test'))).text(),'<html>Group ordering</html>');
 const r=await app(new Request(origin+'/api/groups',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)}));
 assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(calls,1);
 assert.equal((await app(new Request(origin+'/api/groups',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}))).status,403);assert.equal(calls,1);
 assert.equal((await app(new Request(origin+'/missing'))).status,404);
});
test('Arvan refuses oversized bodies and arbitrary proxy targets',async()=>{
 const app=createArvanHandler('ok');
 assert.equal((await app(new Request(origin+'/api/orders',{method:'POST',body:'x'.repeat(24001)}))).status,413);
 assert.equal((await app(new Request(origin+'/api/unknown?target=https://evil.test'))).status,404);
});
