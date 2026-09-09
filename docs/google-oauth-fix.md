# Google authentication: same-origin production proxy

## Confirmed findings

Public checks during this audit returned HTTP 200 **text/html (React index.html)** for all three frontend URLs:

- https://unimarket-web.onrender.com/api/auth/google/config
- https://unimarket-web.onrender.com/api/auth/check
- https://unimarket-web.onrender.com/healthz

The backend https://unimarket-08di.onrender.com/healthz returned HTTP 200 JSON (`{"ok":true}`). These observations describe the currently deployed version, not the local changes.

The checkout had no `frontend/server.cjs` and no `start:production` script. React defaulted to the backend's production origin. The previous deployment instructions used a Static Site and cross-site `SameSite=None` cookies. This does not implement the required frontend proxy, and creates reliance on third-party cookie availability. A 200 HTML response was not rejected by Axios. Session checks cleared users on all errors and could overwrite newer authentication state. These are confirmed code defects; actual Render environment and Google Cloud settings were not accessible.

## Required Render frontend settings

Use a **Web Service**, not a Static Site. A static-site rewrite cannot run the Node proxy. Preserve the requested frontend hostname when migrating the service; coordinate the service name/domain in Render rather than deploying under a different origin unnoticed.

| Setting | Exact value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start:production` |
| Health check path | `/healthz` |
| `NODE_ENV` | `production` |
| `API_PROXY_TARGET` | `https://unimarket-08di.onrender.com` |
| `REACT_APP_API_URL` | `/api` |
| `API_PROXY_SECRET` | A new random server-only value of at least 32 characters, identical on both services |

`PORT` is supplied by Render. Production React uses `/api` even if an obsolete absolute API URL remains in the build environment. No production hostname or Google credentials are embedded in React source. `REACT_APP_APP_ORIGIN` was not present and is unnecessary.

The Node server streams `/api/*`, `/uploads/*`, and `/socket.io/*` to the backend without stripping `/api`. It forwards bodies, cookies and redirects, and tunnels WebSocket upgrades. API requests never use the SPA fallback. Frontend `/healthz` measures frontend process availability; `/api/auth/google/config` separately checks frontend-to-backend reachability.

## Required Render backend settings

| Setting | Exact value |
| --- | --- |
| Root directory | `Backend` |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://unimarket-web.onrender.com` |
| `GOOGLE_REDIRECT_URI` | `https://unimarket-web.onrender.com/api/auth/google/callback` |
| `API_PROXY_SECRET` | Same server-only value as the frontend Web Service |

Preserve existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `MONGO_URL`, SMTP/email, Cloudinary, push and all other application settings. Do not replace credentials. Remove the obsolete `COOKIE_SAME_SITE=none` override; cookies now consistently use `Lax`. Cookies remain host-only, HttpOnly, and Secure in production. No `.onrender.com` cookie domain is used.

The additional `API_PROXY_SECRET` protects the forwarded client IP used by existing rate limits. Create one random value in your secret manager and set it identically on both Render services; it does not replace any existing credential. Never name it `REACT_APP_*` or expose it in React. The frontend signs the IP, method, path and timestamp; the backend rejects forged or stale assertions. This avoids a shared rate-limit bucket for all frontend users without trusting arbitrary headers on the public backend.

Proxy trust defaults to one hop in production and zero locally; `TRUST_PROXY_HOPS` accepts an explicit nonnegative integer. Before deployment sign-off, verify the actual forwarding chain and per-client rate-limit identities on Render. Do not blindly increase the hop count or use `trust proxy=true`: the public backend has a shorter access path than the frontend-proxied path. The frontend selects the client address using its bounded proxy trust setting, strips supplied internal assertion/forwarding headers, and creates a fresh signed assertion. Keep backend proxy trust conservative; the signed assertion handles the additional frontend hop for authentication rate limiting. Production Secure cookies depend on `NODE_ENV`, not an unreliable incoming HTTP socket after TLS termination. See [Express proxy trust guidance](https://expressjs.com/en/guide/behind-proxies/) and [Render Web Services](https://render.com/docs/web-services).

## Google Cloud: existing Web application OAuth client

Authorized JavaScript origin:

```text
https://unimarket-web.onrender.com
```

Authorized redirect URI:

```text
https://unimarket-web.onrender.com/api/auth/google/callback
```

Replace the obsolete production backend callback entry. Do not add `/api` to the JavaScript origin. Keep the existing client ID and secret on the backend only. If consent is in testing, include the test accounts in the allowed audience.

For local development, retain separate entries:

- Origin: `http://localhost:3000`
- Callback: `http://localhost:8000/api/auth/google/callback`

Local backend uses `NODE_ENV=development`, `CLIENT_URL=http://localhost:3000`, `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`; frontend `npm start` defaults to `http://localhost:8000/api`. Use `localhost` consistently. To test the production proxy locally, build React and run `API_PROXY_TARGET=http://localhost:8000 npm run start:production`, with the backend callback set to the frontend `/api/auth/google/callback` address.

## Behavior and performance

- Existing state, nonce, PKCE, signed Google identity verification, email ownership proof, username uniqueness and session revocation remain intact.
- Production config rejects a callback on a different origin, with a safe server diagnostic.
- Existing Google users land on home. New users complete their username and land on profile. An existing linked session clears a stale pending cookie.
- Concurrent session checks share a request. Login, logout and Google completion invalidate old checks. Temporary network/server failures retry once and preserve the current user; visible retry controls are available.
- Google/OTP completion uses the authenticated user returned by the backend, avoiding a redundant session request and race.
- Axios rejects HTML responses, including HTTP 200 SPA fallback pages.
- Removed a redundant unread request at socket creation; retained reconnect/event reconciliation. App subscribes only to relevant auth state, so unread/presence updates do not rerender the entire route tree.
- Existing lazy listing images, parallel profile listing requests, saved-state request coalescing and database indexes remain. No pagination, API response redesign or feature removal was introduced.

## Verification and remaining deployment work

Local automated verification and production verification are separate. The production service currently still returns HTML for the frontend API paths: these local edits have not been deployed.

After deploying **both** services with the settings above:

1. Request frontend `/api/auth/google/config`: expect JSON `{ "enabled": true }`.
2. Request frontend `/api/auth/check` signed out: expect 401 JSON, not 200 HTML. Signed in: expect 200 with the public user.
3. Check both `/healthz` endpoints return JSON with HTTP 200, and verify API reachability through the frontend.
4. In a browser, sign up with a new Google identity, complete username/email proof if requested, reach profile, refresh, visit a protected route, logout, then sign in with the same Google identity and reach home.
5. Test an existing password account with matching email: linking must require the emailed code and must preserve the username and user ID.
6. Confirm browser cookies `jwt`, `google_state`, `google_pending` have the frontend host, HttpOnly, Secure and SameSite=Lax while relevant to the flow.
7. Check real uploads/Cloudinary, chat socket reconnection, notifications and per-client rate limiting in the deployed topology.
8. Repeat with real Google in Chrome, Safari, Firefox, Edge, iPhone/iPad and Android. Local headless Chrome with a mocked provider does not certify those devices, Google consent settings or real SMTP delivery.

Final local results:

- `npm install --no-audit --no-fund` (frontend): passed; the initial `npm ci` attempt hit an existing cache-directory cleanup error, then installation completed without lockfile changes.
- `npm ci --no-audit --no-fund` (backend): passed.
- `npm run build` (frontend): passed; main JavaScript is 156.86 kB gzip. Existing browser-data age warnings remain.
- `CI=true npm test -- --watchAll=false --runInBand`: **85 tests passed across 15 suites**.
- `npm run test:proxy`: passed; exercises GET/POST/PUT/PATCH/DELETE, query strings, JSON, multipart uploads, cookies, separate Set-Cookie headers, redirects, WebSockets, assets, SPA routes, signed forwarding and unavailable-backend JSON errors.
- Backend `npm test` with `AUTH_TEST_MONGO_URL=mongodb://127.0.0.1:27028/auth_test?replicaSet=authTest`, `SAVED_TEST_MONGO_URL=mongodb://127.0.0.1:27028/saved_test?replicaSet=authTest`, `CHAT_TEST_MONGO_URL=mongodb://127.0.0.1:27029`: **20 tests passed, zero skipped**, including auth/Google, OTP, session revocation, usernames, chat, saved items, moderation/admin, reports, push and signed proxy identities.
- `AUTH_BROWSER_PORT=18739 UNIMARKET_GOOGLE_PREVIEW=mock node test/auth.browser.test.cjs`, against the isolated `auth-browser-server.js` and production React build: passed password signup → OTP → profile/settings → logout → username login, plus Google initiation → frontend callback proxy → username → profile → refresh → logout → existing Google sign-in → home. Auth page layouts checked at 1440, 768, 390 and 320 px. Google and email transports are mocked.
- Actual backend `npm start` using a disposable local database and development settings: passed; `/healthz` returned HTTP 200 JSON.
- JavaScript syntax and `git diff --check`: passed.

The first sandboxed network tests could not open local ports/reach MongoDB; the reported successful integration runs used permitted local networking. Existing occupied preview ports were avoided using isolated ports. No test was skipped to claim a pass.

 Backend integration tests use explicitly isolated local databases; Google and email transports are mocked. No production account or database was modified during verification.

## Complete file change list

- `Backend/index.js`
- `Backend/src/controllers/googleAuth.controller.js`
- `Backend/src/lib/socket.js`
- `Backend/src/services/authSecurity.js`
- `Backend/src/services/googleConfig.js`
- `Backend/src/services/proxyIdentity.js`
- `Backend/test/auth-browser-server.js`
- `Backend/test/auth.browser.test.cjs`
- `Backend/test/google-config.test.js`
- `Backend/test/proxy-identity.test.js`
- `docs/authentication.md`
- `docs/google-oauth-fix.md`
- `frontend/package.json`
- `frontend/server.cjs`
- `frontend/src/App.js`
- `frontend/src/Components/Profile/forms/AuthShared.jsx`
- `frontend/src/Components/common/RequireAuth.jsx`
- `frontend/src/Components/lib/axios.js`
- `frontend/src/Components/lib/axios.test.js`
- `frontend/src/Components/store/useAuthStore.js`
- `frontend/src/Components/store/useAuthStore.test.js`
- `frontend/src/config/api.js`
- `frontend/src/pages/AuthCodePage.jsx`
- `frontend/src/pages/GoogleCompletePage.jsx`
- `frontend/src/pages/GoogleCompletePage.test.jsx`
- `frontend/test/proxy.test.cjs`
