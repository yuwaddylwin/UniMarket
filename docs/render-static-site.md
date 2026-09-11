# Render Static Site migration

Code is prepared for a separate static frontend and backend Web Service. Nothing has been deployed, no live environment has been changed, and the existing frontend server is retained for rollback.

## Inspection findings

This is Create React App (`react-scripts`), not Vite or Next.js. `npm run build` emits `frontend/build`. `BrowserRouter` handles all page routing. The old `server.cjs` serves that build, provides an index.html fallback, and proxies `/api`, `/uploads`, and Socket.IO upgrades. It forwards cookies and OAuth redirects and signs client-IP assertions for backend rate limiting.

All frontend business API requests use the shared Axios instance: authentication/OTP, profile, listings, accommodation, saves, chat, moderation/reports, admin, uploads and push subscription management. Axios already uses `withCredentials: true`. GoogleButton navigates to `${API_BASE_URL}/auth/google`; Socket.IO already uses `API_ORIGIN`, credentials and WebSocket transport. Relative uploaded images resolve through that same origin. Cloudinary URLs remain untouched. The push worker serves on the frontend origin and does not cache API responses.

Before this change, production ignored `REACT_APP_API_URL`, forced `/api`, required a shared proxy secret at backend startup, and rejected a Google callback on any origin other than the frontend. Those were the proxy dependencies preventing static hosting.

Authentication is a signed JWT in a host-only HttpOnly cookie, with session-version revocation. Legacy bearer tokens are accepted by HTTP and Socket.IO, but current login/Google completion clears localStorage tokens and relies on cookies. No new token strategy was added. Logout uses the same cookie options when clearing the session.

The backend still owns the complete Google flow: state cookie, persisted state/nonce and PKCE verifier, code exchange, ID-token verification, account linking with email proof, pending registration, and session creation. Google returns to the backend `/api/auth/google/callback`; the backend redirects to frontend `/auth/google/complete`. That page checks pending registration or restores `/auth/check`. Client secrets never enter the frontend.

## A–B. Files and changes

| File | Change |
| --- | --- |
| `frontend/src/config/api.js` | Honor public API URL in production; normalize trailing slashes; one URL for API/OAuth/socket/assets. Unset value retains legacy proxy behavior. |
| `frontend/src/config/api.test.js` | Regression coverage for production URLs, assets and proxy fallback. |
| `frontend/src/Components/lib/axios.js` | API/HTML error now mentions API URL as well as legacy proxy. Credentials/token behavior unchanged. |
| `frontend/scripts/build-static.cjs` | Dedicated static build validates hosted HTTPS API URL and rejects obvious backend secrets in public variables, including CRA .env files. |
| `frontend/package.json` | Standard `build` and `build:static` validate the API URL; explicit `build:proxy` retains legacy builds. |
| `frontend/.env.example`, `frontend/.gitignore` | Track safe example public configuration. |
| `frontend/README.md` | Project-specific build commands and migration link. |
| `Backend/index.js` | Proxy secret optional for direct browser requests; still validate a supplied secret. |
| `Backend/src/services/googleConfig.js` | Permit configured HTTPS backend callback on a separate origin; retain URL/path/environment validation. |
| `Backend/src/services/authSecurity.js` | Configurable `COOKIE_SAME_SITE=lax|none`; preserve lax default; none requires production secure cookies. |
| `Backend/test/google-config.test.js` | Cover direct production callback and cookie configuration while preserving proxy compatibility. |
| `render.yaml` | Optional new static preview Blueprint with build, public variable, SPA rewrite and asset caching. |
| `docs/render-static-site.md` | This deployment/testing/rollback guide. |

## Cookie/domain prerequisite

For dependable authentication while preserving the existing cookie strategy, use HTTPS sibling custom domains under a domain you control, for example:

- Frontend: `https://app.example.com`
- Backend: `https://api.example.com`
- `COOKIE_SAME_SITE=lax` (default)

Replace example.com with your actual domain. These are different origins but the same site. Cookies remain host-only on the API; do not add a Domain attribute or share JWT cookies with every subdomain. Google state specifically stays `SameSite=Lax`, allowing Google's top-level GET callback. Credentialed Axios and sockets send the API cookie on same-site requests.

Two separate `*.onrender.com` hosts are cross-site: `onrender.com` is in the [Public Suffix List](https://raw.githubusercontent.com/publicsuffix/list/master/public_suffix_list.dat). For a limited cross-site preview, set backend `COOKIE_SAME_SITE=none` (production HTTPS only). This permits cross-site cookie delivery **only when browser policy allows third-party cookies**; it cannot override blocking in Safari, privacy modes or user settings. Both regular login and Google pending/session cookies, plus authenticated sockets, can fail under blocking. Do not sign off a reliable production migration using only a browser with third-party cookies enabled. Use same-site custom domains for the intended cookie architecture. See [cookie semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

## C, F, H. Frontend Render settings

Create a **new Static Site** using a test branch; retain the current Web Service. Dashboard settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build:static` |
| Publish directory | `build` |
| Start command | None |
| Public build variable | `REACT_APP_API_URL=https://api.example.com` |
| Rewrite source | `/*` |
| Rewrite destination | `/index.html` |
| Rewrite action | **Rewrite**, not Redirect |

`REACT_APP_API_URL` is the only required frontend application variable and is safe to expose. `/api` suffix is also supported. Use the public HTTPS backend URL, never a Render internal address. Do not use VITE_ or NEXT_PUBLIC_ variables. Do not put credentials in the URL. Rebuild after changing it. Leave PUBLIC_URL unset for root hosting.

`render.yaml` provides these settings if using a new Blueprint; use a unique service name that does not match an existing service. It does not manage your backend. Manual Dashboard creation requires entering the rewrite yourself; merely committing YAML does not apply it to a manually created service. [Render CRA instructions](https://render.com/docs/deploy-create-react-app), [rewrite rules](https://render.com/docs/redirects-rewrites), [Blueprint reference](https://render.com/docs/blueprint-spec).

The rewrite serves existing routes including `/login`, `/signup`, `/profile`, `/chat`, `/products/:id`, `/accommodations/:id`, `/auth/google/complete`, verification/password routes and `/admin/*`. Actual detail routes are `/products/123` and `/accommodations/123`; `/items/123` and `/accommodation/123` were not existing frontend routes and are not added here. API and OAuth callback requests go to the backend domain, never through this SPA rewrite.

## D, G. Backend Render settings

Keep **Web Service**, root `Backend`, existing build/start commands (`npm ci`, `npm start` if configuring a new preview service). Keep MongoDB, mail, Cloudinary, push, JWT and Google credentials on the backend.

| Variable | Configuration |
| --- | --- |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Exact frontend origin, e.g. `https://app.example.com`; no trailing slash, path, comma-separated list or wildcard. Drives HTTP CORS, CSRF origin guard, Socket.IO CORS/handshake, Google return destination and email links. |
| `GOOGLE_REDIRECT_URI` | `https://api.example.com/api/auth/google/callback` using the same API host as REACT_APP_API_URL. |
| `COOKIE_SAME_SITE` | `lax` for same-site domains; `none` only for cross-site setup with the limitations above. |
| `TRUST_PROXY_HOPS` | Keep the correct Render proxy hop count; existing production default is `1`. Verify client IP/rate limiting in the preview. |
| `API_PROXY_SECRET` | Not required for a direct static frontend. Keep the existing value on backend and old frontend server while retaining that proxy. Never put it in static build variables or REACT_APP_ variables. Remove backend value only after legacy proxy retirement if desired. |
| `MONGO_URL`, `JWT_SECRET` | Keep existing backend secrets unchanged for production. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Keep backend OAuth credentials; no browser Google SDK is used. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Keep backend mail configuration. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Keep backend upload configuration. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Keep existing push settings if enabled. Frontend fetches public key through the API. |
| `PORT` | Render-provided port; preserve existing handling. |

There is no separate CORS or Socket.IO URL variable: both server allowlists already use CLIENT_URL; the socket client derives its target from REACT_APP_API_URL. HTTP allows Content-Type and Authorization with credentials; do not change origin to `*`. WebSocket handshake also explicitly checks the origin. Proxy IP signing is optional; direct requests fall back to Express req.ip. API_PROXY_TARGET belongs only to the retained legacy frontend server and is not used by the Static Site.

## E. Google Cloud OAuth settings

Keep the existing Web application OAuth client (or use a separate test client for isolation). Add the exact **Authorized redirect URI** `https://api.example.com/api/auth/google/callback`. Match scheme, hostname, path and lack of trailing slash with backend GOOGLE_REDIRECT_URI. Keep the old proxy callback registered while rollback is needed.

**Authorized JavaScript origins:** this server-side authorization-code flow does not require browser Google SDK origins. If maintaining that list, use only the exact frontend origin `https://app.example.com`, with no path; it does not replace the authorized redirect URI. Do not move the callback to frontend `/auth/google/complete`. That route only finishes the app session/registration after backend validation.

## I. Verification and production test checklist

Local checks are recorded below. They do not substitute for browser tests against configured Render domains, real Google consent, SMTP, Cloudinary and MongoDB.

- [ ] Load the static site and confirm assets load without a frontend wake-up page. Confirm Network API requests target the backend host and return JSON, including errors.
- [ ] Refresh `/login`, `/signup`, `/profile`, `/chat`, a real `/products/:id`, `/accommodations/:id`, `/auth/google/complete`, verification routes and admin routes. Verify protected routing is still enforced.
- [ ] Sign up, receive OTP, test invalid/expired/resend codes, verify and restore the session. Test password reset and legacy verification links.
- [ ] Sign in with username and Gmail/email plus password; refresh, open another tab and reopen browser. Inspect backend jwt cookie: HttpOnly, Secure, expected SameSite, Path=/, no Domain. No JWT in URL or newly issued localStorage token.
- [ ] Google new-user signup with username; returning linked-user signin; existing-email linking with OTP; cancel consent; retry expired flow. Verify Google callback hits backend, then frontend completion successfully restores pending/session data. Test with stale legacy bearer token present.
- [ ] Logout clears backend session cookie; refreshing stays logged out; chat socket disconnects. Sign in as another account and verify saved/chat state isolation.
- [ ] Test Chrome, Safari and mobile browsers with third-party cookies blocked. This is required for the selected custom-domain configuration.
- [ ] Check allowed-origin API preflight/credentials; reject unrelated-origin mutations and socket handshakes. Verify no login loop or repeated unauthorized requests after successful login.
- [ ] Two users exchange live messages, attachments, online/unread/seen updates; reconnect after network loss; delete chat; block/unblock/report; verify blocked-user behavior.
- [ ] Test profile edits/photos, product/accommodation create/edit/delete/status, search, save/unsave across reloads, admin permissions/actions and reports.
- [ ] Upload through backend to Cloudinary, display images on listings/profile/chat, and check any historical `/uploads/` images remain available on the backend.
- [ ] Enable push on the new frontend origin, send a background message and verify notification click routes. Existing subscriptions/permissions belong to the old origin and may require enabling again.
- [ ] Inspect built JS, source maps and Network: no Google client secret, JWT secret, DB/mail/Cloudinary credentials or proxy secret. Static build environment must contain public data only; the guard is not an exhaustive secret scanner.
- [ ] Verify frontend layout at desktop/mobile sizes and test backend cold starts. The SPA currently waits for `/auth/check` before rendering routes; static hosting removes the frontend service wake-up but backend cold starts can still show “Loading UniMarket…”. No UI/auth-loading redesign is included.

## J. Preview, cutover and rollback

For fully isolated testing, create a temporary backend Web Service from this branch with an isolated test MongoDB database, test mail recipients and appropriate test credentials. Use sibling domains such as `preview.example.com` and `api-preview.example.com`. Set that backend CLIENT_URL to the preview frontend and register its own exact Google callback. Do not point a second worker-running backend at the production database merely to test: startup migrations and background moderation/chat jobs exist.

The current backend has one canonical CLIENT_URL. Pointing it at a new static origin would alter OAuth redirects, email links and CORS for existing users. Do not change the live backend environment merely to test preview. The small code changes preserve old behavior with existing environment values, but a full dual-origin OAuth rollout has intentionally not been introduced.

After successful preview tests, schedule the production domain/configuration switch: build the new static site for the production API host, configure the backend/client/callback domains consistently, and switch the frontend custom domain. Leave the old Web Service and its settings intact for rollback. Existing host-only proxy cookies will not transfer to the new backend host; users should expect to sign in again. Complete pending OAuth/OTP flows before switching, or restart them afterward.

Rollback restores the old frontend routing/domain and backend CLIENT_URL, GOOGLE_REDIRECT_URI and cookie setting; retain the shared API_PROXY_SECRET and old Google redirect registration. For rebuilding the old frontend, omit REACT_APP_API_URL and use `npm run build:proxy` plus `npm run start:production`. No live resources have been changed by this work.

## Local verification results

- `npm install --no-audit --no-fund`: passed; lockfile unchanged.
- `REACT_APP_API_URL=https://api.example.com npm run build:static`: passed.
- `REACT_APP_API_URL=https://api.example.com npm run build`: passed. Example host was used only to validate bundling; rebuild with your actual host before deployment.
- Frontend Jest: 16 suites / 89 tests passed, including existing authentication/session, Google completion, chat, saves, admin and profile tests.
- Backend `npm test`: 3 passed, 4 MongoDB-dependent integration suites skipped because isolated test database URLs were absent. Cookie validation regression test also passed after adding invalid-setting coverage.
- Static build guard rejected missing API URL, localhost and a public Google secret variable.
- All build-manifest files exist. Compiled JavaScript contains the configured API host and no searched backend-secret identifiers or local API fallback. No frontend source references Google/backend secrets. This does not audit external Render environment values.
- `git diff --check`: passed. Existing CSS, UI components, business feature implementations, OAuth controllers and socket authentication are unchanged.
- Build reports outdated Browserslist/baseline data warnings, without compilation failures.
- Real Google consent, SMTP delivery, MongoDB feature integration, browser cookie persistence, live Socket.IO and Render route refresh remain unverified until the isolated preview is configured. No deployment was performed.

## Exact settings for the reported Render hosts

The reported frontend HTML at `/api/auth/google/config` means the deployed browser bundle still targets the frontend origin and that path is being served as a page. The original source forced production `/api` even when REACT_APP_API_URL was set. The legacy Node server only proxies if actually started with `npm run start:production` and the correct API_PROXY_TARGET. A static server or SPA rewrite cannot replace it. The error wording reported is also the older wording, not the updated local interceptor. Ensure the changed code is in the deployed commit; saving environment variables alone cannot update an already-built bundle.

Standard `npm run build` now runs the static URL validation too. A missing public backend setting fails the build. `build:proxy` explicitly retains the old build path for rollback.

Frontend Static Site (once the browser-cookie prerequisite is resolved): root `frontend`, build `npm ci && npm run build`, publish `build`, no start command, Rewrite `/*` → `/index.html`.

```dotenv
REACT_APP_API_URL=https://unimarket-08di.onrender.com
```

Backend Web Service: root `Backend`, build `npm ci`, start `npm start`.

```dotenv
NODE_ENV=production
CLIENT_URL=https://unimarket-web.onrender.com
GOOGLE_REDIRECT_URI=https://unimarket-08di.onrender.com/api/auth/google/callback
COOKIE_SAME_SITE=none
TRUST_PROXY_HOPS=1
```

These exact two hosts require cross-site cookies. They fix direct API routing/CORS but **do not satisfy reliable Safari authentication**. Keep cookies HttpOnly, Secure, Path=/ and host-only (no Domain). For reliable Safari and Chrome with third-party cookies blocked, use sibling HTTPS custom domains pointing to the same Render services and `COOKIE_SAME_SITE=lax`, updating the frontend API URL, CLIENT_URL and callback accordingly. If the literal onrender.com API URL is mandatory, the cross-browser cookie requirement cannot be guaranteed without a further architecture change. Do not interpret a successful build or enabled Google config as session verification.

Google Console Authorized redirect URI: `https://unimarket-08di.onrender.com/api/auth/google/callback`. Authorized JavaScript origin, if retained in the console: `https://unimarket-web.onrender.com`; the existing backend OAuth flow does not require a JavaScript SDK origin. Keep the old proxy callback registered for rollback. Backend GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must remain the matching existing OAuth client pair; do not rotate or expose them. Keep JWT_SECRET, MONGO_URL, SMTP, Cloudinary and VAPID values unchanged. API_PROXY_SECRET stays private and may remain for the retained proxy; it is not needed by direct static requests.

Local development stays on `http://localhost:3000` with backend `http://localhost:8000`: use NODE_ENV=development, CLIENT_URL=http://localhost:3000, GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback, COOKIE_SAME_SITE=lax. Register that exact local callback with the appropriate Google client. Leave local REACT_APP_API_URL unset or set it to http://localhost:8000. Do not copy production NODE_ENV or SameSite=None into local HTTP configuration.

Follow-up verification: standard build passed with REACT_APP_API_URL=https://unimarket-08di.onrender.com, and failed as intended when that setting was missing. All 90 frontend tests passed. Backend results remain 3 passed / 4 database suites skipped. Built assets contain the requested API origin, with no searched local/example API fallback or backend-secret identifiers. Live endpoint inspection from this environment timed out; actual deployed headers/configuration were not independently verified.
