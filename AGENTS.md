# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

Order management: keep a clear «سفارش‌های من» entry and per-order edit/delete controls. Changes must remain restricted to each order owner; private management links allow access from another browser. Preserve active group orders during deployments.

GitHub migration: publish the full source and frontend through GitHub Pages. Keep shared order storage on the existing Railway persistent volume because Pages cannot run the writable API. Allow only the confirmed Pages origin in API CORS. Preserve private management access across the origin change through the explicit transfer flow; never commit live databases, order snapshots or private access keys.

Regional availability is a strict user requirement: the frontend AND the writable order API must work from Iranian IPs. A successful check from another country does not satisfy this requirement. Verify the deployed route from Iranian networks before claiming this is fixed. Do not hide a disconnected state, substitute local-only orders, or change/remove live storage to work around a network block. The current local-network failure returns an HTML 403 with "Local URLfilter Block" for the Railway API; this is not evidence of an application IP denylist or a nationwide block.

2026-11-23 regional diagnostics: Globalping HEAD checks returned HTTPS 200 for both public hosts from three Iranian probes per host. An OPTIONS preflight to /api/orders returned 204 with the exact Pages origin and GET/POST/DELETE allowed from three Iranian networks. External API GET returned valid JSON with correct CORS. This is sampled connectivity evidence, not proof of end-to-end ordering on every Iranian ISP. The user's computer still receives the local filter's HTML 403; do not call the user's problem fixed until their actual network works. Diagnostic workflow runs are in the repository; the summarized report is in the task's outputs/public-connectivity.json.

The user reports public-site failure on office, home and mobile connections. Treat their actual-network failure as unresolved even when regional probes pass. The alternate gateway in gateway/ is a candidate deployment; do not change the live API endpoint until it is deployed and validated from those connections.
