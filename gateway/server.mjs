import http from 'node:http';
import { proxy } from './proxy.mjs';

const server = http.createServer(async (req, res) => {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 24000) {
        res.writeHead(413, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: 'حجم سفارش بیش از حد مجاز است.' }));
        return;
      }
      chunks.push(chunk);
    }
    // The incoming Host cannot select an upstream or change the allowed origin.
    const request = new Request('http://gateway.local' + req.url, {
      method: req.method, headers: req.headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) })
    });
    const response = await proxy(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: 'ارتباط برقرار نشد. دوباره تلاش کنید.' }));
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.PORT || 4180), process.env.HOST || '0.0.0.0', () => console.log('Order gateway started'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
