import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// The standalone server and Railway Function both ship one HTML document.
const root = path.resolve('dist/client');
function asset(address) {
  const pathname = new URL(address, 'https://build.invalid').pathname;
  const marker = pathname.lastIndexOf('/assets/');
  if (marker < 0) throw new Error('Unexpected build asset: ' + address);
  const file = path.resolve(root, pathname.slice(marker + 1));
  if (!file.startsWith(root + path.sep)) throw new Error('Invalid build asset');
  return readFileSync(file, 'utf8');
}
const file = path.join(root, 'index.html');
let html = readFileSync(file, 'utf8');
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_, source) => '<script type="module">' + asset(source).replace(/<\/script/gi, '<\\/script') + '</script>');
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, (_, source) => '<style>' + asset(source).replace(/<\/style/gi, '<\\/style') + '</style>');
if (/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"/.test(html)) throw new Error('Client build still requires external entry assets');
writeFileSync(file, html);
console.log('Prepared standalone client HTML');
