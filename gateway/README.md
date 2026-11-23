# Alternate public order route

Status: implemented and tested locally; not deployed or validated on the user's networks.

This Node service gives the GitHub Pages app an API route on another hosting
provider. It forwards only order API requests to the existing Railway service;
it does not create a second database, migrate orders, change ownership keys,
or store request bodies in logs. The Pages origin is fixed and all order data
responses use `Cache-Control: no-store`. TLS verification remains enabled.

The root `render.yaml` defines a free Render web service, with no persistent disk
or extra database. Render supplies the public hostname and TLS certificate.
The free service sleeps after idle periods, so this is a candidate route to test,
not an always-on availability guarantee. No paid service is authorized by this file.
See https://render.com/docs/free for the current hosting limits.

Deploy from the owner's connected Render account using the repository Blueprint.
The service root directory is `gateway`, the start command is `node server.mjs`,
and the health check is `/health`. That health endpoint reports process liveness;
it does not establish upstream database or regional availability.

Before changing `API_BASE_URL` in the GitHub Pages repository:

1. Verify the deployed gateway's GET returns the existing order records, without
   printing or exporting ownership keys.
2. Verify POST and DELETE preflight headers for the exact Pages origin.
3. Verify the gateway on the user's office, home and mobile connections, not just
   remote probes. Create/edit/delete one separate temporary order and remove it.
4. Point the Pages build to the verified gateway origin and publish it.
5. Confirm the public site now works on those connections and existing records
   remain unchanged. Leave Railway storage and its original domain intact.

If the candidate hostname is also blocked on the user's networks, do not switch
the app to it or report the problem as fixed.

Tests: `node --test tests/gateway.test.mjs` from the repository root. The tests
cover fixed upstream routing, owner-body preservation, strict CORS, browser write
preflights and upstream/filter errors. They are not live regional verification.
