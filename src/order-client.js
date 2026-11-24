const connectionMessage = 'ارتباط با فضای سفارش‌ها برقرار نشد. انتخاب‌های شما حفظ شده‌اند؛ دوباره تلاش کنید.';

export function createOrderAPI(origin, fetchRequest = fetch, timeout = 90000) {
  return async (path, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetchRequest(origin + path, { cache: 'no-store', ...options, signal: controller.signal });
      let body;
      try { body = await response.json(); } catch { throw Error(connectionMessage); }
      if (!response.ok) throw Error(body.error || 'درخواست انجام نشد.');
      return body;
    } catch (error) {
      if (controller.signal.aborted) throw Error('پاسخ سرور طول کشید. انتخاب‌های شما حفظ شده‌اند؛ دوباره تلاش کنید.');
      if (error instanceof TypeError) throw Error(connectionMessage);
      throw error;
    } finally { clearTimeout(timer); }
  };
}

// Share a pending read instead of continually superseding it on slow networks.
// A confirmed write invalidates reads started before it, so they cannot undo it.
export function createOrderSync({ read, onOrders, onConnection, onError, onLoaded }) {
  let generation = 0, active = null;
  return {
    invalidate() { generation++; active = null; },
    refresh() {
      if (active) return active;
      const version = generation;
      const operation = Promise.resolve().then(read).then(body => {
        if (!Array.isArray(body.orders)) throw Error(connectionMessage);
        if (version !== generation) return;
        onOrders(body.orders); onConnection(true); onError('');
      }).catch(error => {
        if (version !== generation) return;
        onConnection(false); onError(error.message);
      }).finally(() => {
        if (version === generation) { active = null; onLoaded(); }
      });
      active = operation;
      return operation;
    }
  };
}
