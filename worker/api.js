import menu from '../src/menu.json' with { type: 'json' };

const catalog = new Map(menu.items.map(item => [item.id, item]));
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
async function hash(token) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
}
function clean(value, max) {
  if (typeof value !== 'string' || value.trim().length > max) throw new Error('اطلاعات واردشده معتبر نیست.');
  return value.trim();
}
function validate(body) {
  if (!uuid.test(body.id) || !/^[a-f0-9]{64}$/.test(body.token)) throw new Error('شناسه سفارش معتبر نیست.');
  const name = clean(body.name, 80), note = clean(body.note ?? '', 500);
  if (name.length < 2) throw new Error('نام خود را کامل وارد کنید.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error('حداقل یک آیتم انتخاب کنید؛ حداکثر ۵۰ آیتم متفاوت مجاز است.');
  const seen = new Set();
  const items = body.items.map(line => {
    const item = catalog.get(line.id);
    if (!item || seen.has(line.id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new Error('آیتم یا تعداد انتخاب‌شده معتبر نیست.');
    seen.add(line.id);
    return { id: item.id, title: item.title, price: item.price, quantity: line.quantity };
  });
  return { id: body.id, token: body.token, name, note, items, total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
}
export async function api(request, env) {
  const url = new URL(request.url);
  const isCollection = url.pathname === '/api/orders';
  const match = url.pathname.match(/^\/api\/orders\/([a-f0-9-]+)$/i);
  if (!isCollection && !match) return null;
  const origin = request.headers.get('origin');
  const allowed = new Set([url.origin, ...(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
  const responseHeaders = { ...headers, vary: 'Origin' };
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: responseHeaders });
  if (origin && !allowed.has(origin)) return json({ error: 'درخواست معتبر نیست.' }, 403);
  if (origin) responseHeaders['access-control-allow-origin'] = origin;
  if (request.method === 'OPTIONS') {
    const method = request.headers.get('access-control-request-method');
    const requestedHeaders = (request.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
    if (!origin || !['GET', 'POST', 'DELETE'].includes(method) || requestedHeaders.some(value => value !== 'content-type')) return json({ error: 'درخواست معتبر نیست.' }, 403);
    return new Response(null, { status: 204, headers: { ...responseHeaders, 'access-control-allow-methods': 'GET, POST, DELETE', 'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '600' } });
  }
  if (!env.DB) return json({ error: 'فضای ذخیره سفارش‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.' }, 503);
  try {
    if (request.method === 'GET' && isCollection) {
      const { results } = await env.DB.prepare("SELECT id, name, note, items_json, total, created_at, updated_at FROM order_entries WHERE status = 'active' ORDER BY created_at DESC").all();
      return json({ orders: results.map(({ items_json, ...row }) => ({ ...row, items: JSON.parse(items_json) })) });
    }
    if (!['POST', 'DELETE'].includes(request.method) || (match && request.method !== 'DELETE')) return json({ error: 'درخواست پشتیبانی نمی‌شود.' }, 405);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'درخواست معتبر نیست.' }, 415);
    const text = await request.text();
    if (text.length > 24000) return json({ error: 'حجم سفارش بیش از حد مجاز است.' }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: 'اطلاعات سفارش معتبر نیست.' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'اطلاعات سفارش معتبر نیست.' }, 400);
    if (request.method === 'DELETE') {
      if (!match || !uuid.test(match[1]) || !/^[a-f0-9]{64}$/.test(body.token)) return json({ error: 'شناسه معتبر نیست.' }, 400);
      const result = await env.DB.prepare("UPDATE order_entries SET status = 'cancelled', updated_at = ? WHERE id = ? AND token_hash = ? AND status = 'active'").bind(new Date().toISOString(), match[1], await hash(body.token)).run();
      if (!result.meta.changes) return json({ error: 'سفارش پیدا نشد یا اجازه لغو آن را ندارید.' }, 403);
      return json({ ok: true });
    }
    let order;
    try { order = validate(body); } catch (error) { return json({ error: error.message }, 400); }
    const now = new Date().toISOString(), tokenHash = await hash(order.token);
    const result = await env.DB.prepare("INSERT INTO order_entries (id, token_hash, name, note, items_json, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, note=excluded.note, items_json=excluded.items_json, total=excluded.total, updated_at=excluded.updated_at, status='active' WHERE order_entries.token_hash=excluded.token_hash AND order_entries.status='active'").bind(order.id, tokenHash, order.name, order.note, JSON.stringify(order.items), order.total, now, now).run();
    if (!result.meta.changes) return json({ error: 'امکان تغییر این سفارش وجود ندارد؛ ممکن است حذف شده باشد.' }, 403);
    return json({ ok: true, id: order.id, total: order.total });
  } catch (error) {
    console.error('Order storage failed:', error.message);
    return json({ error: 'ذخیره یا دریافت سفارش انجام نشد. دوباره تلاش کنید؛ انتخاب‌های شما حفظ شده‌اند.' }, 503);
  }
}
