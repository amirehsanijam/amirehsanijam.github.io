import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { api } from '../worker/api.js';

export function makeDB(db) {
  return { prepare(sql) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const result = db.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; }
    };
    return statement;
  } };
}
export function localAPI() {
  return { name: 'local-order-api', configureServer(server) {
    mkdirSync('.sites-runtime', { recursive: true });
    const db = new DatabaseSync('.sites-runtime/preview.sqlite');
    if (!db.prepare("SELECT name FROM sqlite_master WHERE name='order_entries'").get()) db.exec(readFileSync('drizzle/0000_group_orders.sql', 'utf8'));
    server.httpServer?.once('close', () => db.close());
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const request = new Request('http://' + req.headers.host + req.url, { method: req.method, headers: req.headers, ...(['GET','HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
        const response = await api(request, { DB: makeDB(db) });
        if (!response) return next();
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) { res.writeHead(500); res.end('Local API error'); console.error(error); }
    });
  } };
}
