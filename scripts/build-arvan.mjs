import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
// Avoid a stylesheet fetch to Google before the UI can render on Iranian networks.
const html = readFileSync('dist/client/index.html','utf8').replace(/@import\s*(?:url\([^)]*\)|"[^"]*"|'[^']*')\s*;/g, rule => rule.includes('fonts.googleapis.com') ? '' : rule);
if (html.includes('bonice-order-gateway.onrender.com')) throw Error('Build client with an empty VITE_API_BASE_URL for same-origin Arvan routing');
mkdirSync('dist/arvan',{ recursive: true });
writeFileSync('dist/arvan/index.html',html);
await build({ stdin: { contents: `import { createArvanHandler } from './arvan/handler.js';\nconst handler=createArvanHandler(${JSON.stringify(html)});\naddEventListener('fetch',event=>event.respondWith(handler(event.request)));`, resolveDir: process.cwd() }, bundle: true, platform: 'browser', format: 'iife', target: 'es2022', charset: 'utf8', minify: true, outfile:'dist/arvan/edge.js' });
console.log('Prepared Arvan edge.js and static index.html; API requests stay on the public origin.');
