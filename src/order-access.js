const id = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const accessPattern = new RegExp('^#order=(' + id + ')\\.([a-f0-9]{64})$', 'i');

export function parseManagementLink(fragment) {
  if (typeof fragment !== 'string') return null;
  const match = accessPattern.exec(fragment);
  return match ? { id: match[1].toLowerCase(), token: match[2].toLowerCase() } : null;
}

export function pageLink(address) {
  const url = new URL(address);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid page URL');
  url.search = '';
  url.hash = '';
  if (url.pathname.endsWith('/index.html')) url.pathname = url.pathname.slice(0, -10);
  return url.href;
}

export function managementLink(address, orderId, token) {
  const fragment = '#order=' + orderId + '.' + token;
  if (!parseManagementLink(fragment)) throw new Error('Invalid order access');
  const url = new URL(pageLink(address));
  url.hash = fragment;
  return url.href;
}

export function parseMigrationLink(fragment) {
  if (typeof fragment !== 'string' || !fragment.startsWith('#orders=')) return null;
  const entries = fragment.slice(8).split(',');
  if (entries.length > 100) return null;
  const access = entries.map(entry => parseManagementLink('#order=' + entry));
  return access.every(Boolean) ? access : null;
}

export function migrationLink(address, entries) {
  const url = new URL(pageLink(address));
  if (!entries.length) return url.href;
  url.hash = '#orders=' + entries.map(({ id, token }) => id + '.' + token).join(',');
  if (!parseMigrationLink(url.hash)) throw new Error('Invalid migration access');
  return url.href;
}
