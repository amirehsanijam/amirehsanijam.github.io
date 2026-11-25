import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { brotliCompressSync, constants } from 'node:zlib';
const pack=file=>brotliCompressSync(readFileSync(file),{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
const html=pack('dist/client/index.html'), menu=brotliCompressSync(Buffer.from(JSON.stringify({items:JSON.parse(readFileSync('src/menu.json','utf8')).items.map(({id,title,price})=>({id,title,price}))})),{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
let api=readFileSync('worker/api.js','utf8').replace(/^import menu[^\n]+\n/,'').replace('export async function api','async function api');
api=transformSync(api,{minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:true,target:'esnext',charset:'utf8'}).code;
const schema=readFileSync('drizzle/0000_group_orders.sql','utf8');
const code=`import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
const menu=JSON.parse(brotliDecompressSync(Buffer.from('${menu}','base64')).toString('utf8'));
const html=brotliDecompressSync(Buffer.from('${html}','base64'));
const data=Bun.env.ORDER_DATA_DIRECTORY;
if(!data)throw new Error('Persistent ORDER_DATA_DIRECTORY is required');
mkdirSync(data,{recursive:true});
const db=new Database(data+'/orders.sqlite');
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
if(!db.query("SELECT name FROM sqlite_master WHERE name='order_entries'").get())db.exec(${JSON.stringify(schema)});
db.exec('CREATE TABLE IF NOT EXISTS ordering_groups(id TEXT PRIMARY KEY,title TEXT NOT NULL,admin_hash TEXT NOT NULL)');
if(!db.query('PRAGMA table_info(order_entries)').all().some(c=>c.name==='group_id'))db.exec("ALTER TABLE order_entries ADD COLUMN group_id TEXT NOT NULL DEFAULT 'legacy'");
const env={ALLOWED_ORIGINS:Bun.env.ALLOWED_ORIGINS,DB:{prepare(sql){let args=[];const q={bind(...values){args=values;return q},async all(){return{results:db.query(sql).all(...args)}},async run(){return{meta:{changes:Number(db.query(sql).run(...args).changes)}}}};return q}}};
${api}
export default { port:Number(Bun.env.PORT||3000),hostname:'0.0.0.0',async fetch(request){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')){
  if(request.headers.get('x-forwarded-proto')==='https')url.protocol='https:';
  const result=await api(new Request(url,request),env);
  return result||new Response('Not found',{status:404});
 }
 if(!['GET','HEAD'].includes(request.method)||!['/','/index.html'].includes(url.pathname))return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
}};
`;
if(Buffer.byteLength(code)>96*1024)throw new Error('Function exceeds Railway source limit: '+Buffer.byteLength(code));
writeFileSync('railway/function.ts',code);console.log(JSON.stringify({bytes:Buffer.byteLength(code),limit:96*1024}));
