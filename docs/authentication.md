# UniMarket authentication implementation and deployment

## Audit and architecture

The existing project is React/React Router/Zustand with Axios, Express 5, Mongoose/MongoDB, bcrypt, Nodemailer SMTP, JWT authentication, and Socket.IO. Signup previously accepted only fullName/email/password, saved an unverified user, and emailed a UUID verification link. Login returned a JWT stored in localStorage. Middleware and sockets already understood JWT cookies. User.username existed as an optional lowercase sparse unique field, but registration never populated it. Profile settings already separated an editable display name from a read-only username. Reset components were disconnected placeholders; no password-reset API existed. Listings, saved items, reports, blocks and conversations reference MongoDB user IDs.

The audit covered auth components, routing/layouts, auth store/Axios, middleware/sockets, User and related models, SMTP, listing/seller serialization, chat, saved items, profile/settings and admin/report routes. The implementation extends that architecture, retaining all user IDs and relationships.

## Database and migration

Username is required, immutable in Mongoose, normalized to lowercase, and limited to 3–30 ASCII letters, numbers and underscores. Signup requires an explicit username, including Google signup. MongoDB has a case-insensitive UNIQUE index named `username_ci_unique`; a collection validator rejects missing/noncanonical usernames, including direct database inserts. Final inserts still catch duplicate-key races. The previous sparse index remains for compatibility.

The migration reserves valid existing handles first (preferring already lowercase names). Accounts with missing, invalid or conflicting historical handles receive deterministic `user_<ObjectId>` usernames, with a deterministic collision fallback. Names, email, passwords, verification links, IDs and references remain intact. Valid mixed-case handles are canonicalized. Reruns are idempotent, and existing collection validation is preserved.

Before deployment, back up MongoDB and stop old application instances that can write users. From Backend:

```sh
npm run migrate:usernames
npm run migrate:usernames -- --apply
```

The first command is a read-only count, the second applies changes and constraints. Both use the existing `MONGO_URL`. Startup also runs the migration before accepting traffic. Deploy as one migration/startup writer; do not roll old writers alongside the new required-field validator. The DB user needs collection/index creation and `collMod` privileges. Production data was not accessed or migrated during development; migration verification used disposable local databases.

New fields: private unique Google subject (`googleSub`) and private session revocation counter (`sessionVersion`). Password is private by default and optional for Google-only accounts. `AuthChallenge` stores HMAC digests, attempt counts, expiry and temporary OAuth context. `AuthRate` stores shared request counters. Both collections have TTL indexes; application checks enforce expiry even before TTL cleanup runs.

## Authentication and email

- Signup creates an unverified account and sends a cryptographically random six-digit email code through the existing SMTP transport. SMTP failures preserve the account and offer resend.
- Codes expire in 10 minutes, allow five attempts, have a 60-second resend cooldown, are single-use, and are stored as keyed HMAC digests. Request limits use MongoDB, including IP and identifier limits for password login.
- Successful verification starts the existing JWT session using an HTTP-only cookie. Username and email password login are supported. Existing six-character passwords still work; new/reset passwords require at least eight characters and at most 72 UTF-8 bytes to avoid bcrypt truncation.
- Browser auth no longer receives new JWTs in JSON. Legacy bearer sessions remain readable for compatibility until expiry or revocation. API and socket checks verify sessionVersion. Logout signs out all sessions for the account, clears the cookie and disconnects sockets. Password reset also revokes all sessions.
- Old `/verify/:token` links still work and are consumed atomically. Resend now sends an OTP and routes to `/verify-code`.
- Forgot password accepts verified email only, returns a generic account-presence response and uses a separate reset-code challenge. A Google-only user can establish a password by verifying their email through this flow.
- Mutation Origin checks protect cookie-based requests. CORS must match the exact frontend origin. Auth responses are not cached. No passwords, codes, Google tokens or JWTs are returned from production auth APIs.

## Google setup (required before enabling Google sign-in)

In Google Cloud Console / Google Auth Platform:

1. Select/create your project. Configure Branding, Audience and contact details for UniMarket; add test users while the app is in testing.
2. Create an OAuth client of type **Web application**.
3. Add `https://unimarket-web.onrender.com/api/auth/google/callback` as the production authorized redirect URI; the frontend Web Service proxies it to Express. Local development: `http://localhost:8000/api/auth/google/callback`. See [deployment settings](google-oauth-fix.md).
4. Copy the client ID and secret into backend environment variables below. Never add the secret to React environment variables.
5. Publish/configure the consent screen for your intended audience, then test a real new Google user and an existing account through the deployed site.

Backend environment variables (local `Backend/.env`, or the backend hosting service's environment settings):

| Variable | Value/purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Corresponding secret from Google Cloud |
| `GOOGLE_REDIRECT_URI` | Exact authorized callback URI above |
| `CLIENT_URL` | Exact frontend origin, e.g. `https://unimarket-web.onrender.com`; no trailing slash/path |
| `JWT_SECRET` | Existing strong secret; also keys code digests. Keep stable across instances |
| `MONGO_URL` | Existing MongoDB connection string |
| `NODE_ENV` | `production` on the hosted backend, enabling Secure cookies |
| `COOKIE_SAME_SITE` | Obsolete override; cookies always use `lax` for the same-origin proxy |
| `API_PROXY_SECRET` | New server-only random value, at least 32 characters, identical on frontend and backend; authenticates client IP forwarding for rate limits |
| `TRUST_PROXY_HOPS` | Exact trusted reverse-proxy hop count, only when behind a trusted proxy; local development leaves it unset |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Existing SMTP configuration; same values/service as verification email |

Frontend production environment: `REACT_APP_API_URL=/api`, `API_PROXY_TARGET=https://unimarket-08di.onrender.com`, `NODE_ENV=production`. Run as a Web Service using `npm run start:production`. No Google credentials belong in frontend configuration.

The browser uses only the frontend origin for API and Socket.IO requests. The frontend Node proxy forwards them to the separate backend service, keeping authentication cookies first-party, host-only, HttpOnly, Secure and SameSite=Lax. See [the complete Render/Google deployment guide](google-oauth-fix.md).

Implementation uses Google's authorization-code flow with state, nonce, PKCE, a fixed callback and google-auth-library verification of the signed ID token/audience/issuer/expiry. Stable Google `sub` identifies linked accounts. A matching email NEVER silently links an account: fresh email-code proof is required. Third-party non-Gmail/non-Workspace email identities also require email proof. For an unverified matching account, any pre-existing password is removed when linking to prevent an attacker retaining a pre-registration password. Google passwords/access tokens are not stored. New users explicitly confirm a unique username. Cancellation, invalid state and failed identity verification return to login with a safe error.

Reference: [Google OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect) and [Google email authority guidance](https://developers.google.com/identity/gsi/web/reference/html-reference).

Google sign-in remains disabled when credentials are missing. Local tests mock the Google transport/verified identity; they do not prove live Google credentials or production consent/redirect configuration. Real SMTP delivery was also mocked and still needs a deployed smoke test.

## Frontend and identity changes

Shared UniMarket logo, colors, typography, form spacing and responsive auth cards cover login/signup/OTP/reset/Google completion. Auth pages use the existing layout without fixed bottom navigation. Signup provides debounced, cancelable username availability checks and password confirmation. One OTP field supports mobile numeric keyboards, OS autofill and paste. Error and status feedback uses accessible live regions. Google setup availability is fetched from the backend.

Profile settings show photo, editable display name, permanent username and verified email. Public listing sellers and chat headers show usernames alongside human-readable names; listing responses no longer select seller email. Saved items remain separate. API IDs, listing ownership, search, chat, blocks, reports, moderation and admin relationships are unchanged.

## Files changed

- Backend startup/package files; User model; auth routes/controller/middleware; socket authentication; SMTP utility; item/accommodation seller serializers.
- New `authFlow.controller.js`, `googleAuth.controller.js`, `authSecurity.js`, `usernameMigration.js`, and `scripts/migrate-usernames.js`.
- React App routes/auth store, signup/login/shared form components/CSS, profile settings, chat header, listing feed; new OTP/reset and Google completion pages.
- New backend auth integration/browser tests and isolated preview server; new frontend auth form tests. Existing test fixtures and saved-browser selectors updated for required usernames/cookie auth.
- This deployment/verification guide.

## Verification

Commands for the disposable local replica sets used in development:

```sh
# Backend, with authTest on port 27028 and chatTest on port 27029
AUTH_TEST_MONGO_URL='mongodb://127.0.0.1:27028/auth_test?replicaSet=authTest' \
SAVED_TEST_MONGO_URL='mongodb://127.0.0.1:27028/saved_test?replicaSet=authTest' \
CHAT_TEST_MONGO_URL='mongodb://127.0.0.1:27029' npm test

# Frontend
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Backend tests cover migration/idempotency, direct DB constraints, concurrent duplicate usernames, signup validation, login identifiers, unverified access, OTP wrong/expired/reused/locked/resend behavior, legacy links, reset/session revocation, protected routes, profile edits/immutability, cross-origin rejection, Google new/existing/linking/duplicate/state/cancellation/failure paths and rate limiting. Existing chat, moderation, saved and worker suites exercise relationship/permission regressions. Google and SMTP are transport mocks.

Browser test: build frontend with `REACT_APP_API_URL=http://localhost:8028`, run `UNIMARKET_AUTH_PREVIEW=isolated node test/auth-browser-server.js`, then `node test/auth.browser.test.cjs` from Backend. This disposable test-only server intentionally captures mock email codes; never deploy it. Chrome checks four auth routes at 1440/768/390/320px and signup → verification → profile/settings → logout → username login, cookie privacy and absence of a new localStorage token. Screenshots go to `/private/tmp/unimarket-auth-*.png`.

No TypeScript configuration or standalone lint script exists. React's build runs its configured lint checks; backend JS syntax and diff whitespace are checked separately. Compatible backend dependency security updates resolved all 14 npm audit findings; npm reported zero remaining backend vulnerabilities.

Remaining deployment work: backup/apply migration with old writers stopped, configure Google and cookie/origin/proxy environment settings, deploy both app tiers together, and perform real Google/SMTP smoke tests. Physical iOS/Android devices were not tested; mobile Chrome viewport checks do not substitute for those device checks.

Final recorded results: 18/18 backend tests, 73/73 frontend tests (13 suites), production build with configured lint checks, syntax checks for 39 backend JavaScript files, and clean `git diff --check`. The Chrome flow and four-width layout checks passed; final signup/login screenshots were visually inspected. Browser testing found and fixed fixed-navigation overlap on the signup form. Final output was rebuilt with the normal production API configuration after browser testing.
