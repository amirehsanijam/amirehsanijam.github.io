# ArvanCloud deployment

Target domain: bluedoost.ir. Free Basic CDN and free Edge Computing quota only.

Build with `npm run build:arvan`, then upload `dist/arvan/edge.js` through Edge Computing. The bundle includes the HTML and proxies the fixed order API to the existing Railway database. The browser uses one origin and does not directly contact Railway or Render. Google Fonts CSS is omitted from this bundle to avoid a blocking external stylesheet request; system font fallbacks remain.

The internal API hop uses the existing trusted Pages origin after the edge validates the incoming request origin. Ownership/admin tokens are preserved, never logged, and not included in customer share links. API responses are never cached. This edge does not create or migrate a database.

Status (25 November 2026): application `bonice` created and updated; default address `bonice.amirehsanijam-xcnns.arvanedge.ir`. IRNIC confirms the domain is registered until 23 July 2027 and has saved `e.ns.arvancdn.ir` and `q.ns.arvancdn.ir`. Public .ir delegation is still pending (authoritative NXDOMAIN during setup). The default edge address now resolves, but HTTPS fails with a TLS handshake error. The application and API still require live verification. Do not report either address as working until DNS, TLS and order operations pass.

After activation, bind `bluedoost.ir/*` to the application, configure a valid HTTPS certificate, and verify existing records, create/edit/delete, owner-only access, admin group/reset and unchanged legacy orders. Test from the affected Iranian connections. Keep the original services running until verification succeeds.

Users retain management access through their private order/admin links when opened at the new hostname with the same query and fragment. Browser local storage does not automatically transfer across hostnames. Never publish these private links.
