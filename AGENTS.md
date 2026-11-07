# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

Order management: keep a clear «سفارش‌های من» entry and per-order edit/delete controls. Changes must remain restricted to each order owner; private management links allow access from another browser. Preserve active group orders during deployments.

GitHub migration: publish the full source and frontend through GitHub Pages. Keep shared order storage on the existing Railway persistent volume because Pages cannot run the writable API. Allow only the confirmed Pages origin in API CORS. Preserve private management access across the origin change through the explicit transfer flow; never commit live databases, order snapshots or private access keys.
