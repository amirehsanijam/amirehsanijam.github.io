import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { api } from './worker/api.js';
import { makeDB } from './scripts/local-api.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=process.env.ORDER_DATA_DIRECTORY||path.join(root,'.sites-runtime');
mkdirSync(data,{recursive:true});
const db=new DatabaseSync(path.join(data,'orders.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
if(!db.prepare("SELECT name FROM sqlite_master WHERE name='order_entries'").get())db.exec(readFileSync(path.join(root,'drizzle/0000_group_orders.sql'),'utf8'));
const html=readFileSync(path.join(root,'dist/client/index.html'));
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname.startsWith('/api/')){
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>24000){res.writeHead(413,{'content-type':'application/json'});res.end(JSON.stringify({error:'حجم سفارش بیش از حد مجاز است.'}));return}chunks.push(chunk)}
   const protocol=req.headers['x-forwarded-proto']==='https'?'https':'http';
   const request=new Request(protocol+'://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
   const response=await api(request,{DB:makeDB(db),ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS});
   if(!response){res.writeHead(404);res.end('Not found');return}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)||!['/','/index.html'].includes(pathname)){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:html);
 }catch(e){console.error(e.message);res.writeHead(500);res.end('Server error')}
});
const port=Number(process.env.PORT||4173);
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
function close(){server.close(()=>{db.close();process.exit(0)})}
process.on('SIGINT',close);process.on('SIGTERM',close);
