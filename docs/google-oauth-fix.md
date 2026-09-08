# Google OAuth redirect fix

## Confirmed cause

The local ignored `Backend/.env` had `NODE_ENV=development` and `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`, but `CLIENT_URL=https://unimarket-web.onrender.com`. Google returned to the correct local backend; the backend then redirected to the wrong frontend environment. The localhost session/pending cookie cannot authenticate requests to the hosted API.

Public deployment checks on 2026-09-08 confirmed:

- `https://unimarket-web.onrender.com/auth/google/complete` returns HTTP 200 with the SPA HTML, so a missing rewrite is not the current cause.
- Its deployed bundle `main.eb3ac6a8.js` contains no `/auth/google/complete`, `/auth/google`, or `/verify-code` routes. This older frontend renders no matching route, explaining the blank page.
- `https://unimarket-08di.onrender.com/` returns HTTP 200 / `API is running!`. This API hostname is also configured in `frontend/src/config/api.js` and embedded in the deployed frontend bundle; it was not guessed.
- The deployed API's `/api/auth/google/config` returns HTTP 404. Both deployed app tiers need the existing authentication changes plus this fix.

The project uses Express/Mongoose, google-auth-library, and its existing HTTP-only JWT cookie flow. There is no Django application, `urls.py`, allauth or Django OAuth Toolkit to modify.

## Changes in this fix

- Corrected **only** `CLIENT_URL` in ignored `Backend/.env` to `http://localhost:3000`. The existing Google client ID and secret were preserved byte-for-byte.
- Added Google URL validation: reject mixed localhost/hosted environments, invalid callback paths, mismatched loopback hostnames, and non-HTTPS production URLs. The frontend reports a safe configuration error before sending the user to Google.
- Kept the same backend callback, authorization-code exchange, verified identity, state/nonce/PKCE, secure linking, usernames and cookies.
- Added visible completion loading/error states and bounded frontend requests. Completion clears obsolete bearer storage before restoring the new Google cookie session, distinguishes network failure from missing pending signup, and no longer navigates to the profile when session restoration failed.
- Added clear cancellation/state/exchange/identity/account failure messages without returning authorization codes, tokens or secrets.
- Added configuration and frontend completion regression tests, and extended the isolated browser test to cover new/existing Google sign-in and refresh. Provider transport is mocked in tests.

No additional database/model changes or migrations are required **for this fix**. If deploying the original username/auth changes for the first time, follow the existing migration/deployment steps in `docs/authentication.md`.

## Google Cloud Console — edit the EXISTING Web application client

Authorized JavaScript origins (one entry per line):

```text
http://localhost:3000
https://unimarket-web.onrender.com
```

Authorized redirect URIs (one entry per line):

```text
http://localhost:8000/api/auth/google/callback
https://unimarket-08di.onrender.com/api/auth/google/callback
```

Remove `http://localhost:3000` from redirect URIs if it was added only for UniMarket. The frontend root is an origin/homepage, not this implementation's Google callback. The server authorization flow does not depend on JavaScript-origin registration, but the origins above correctly describe the app.

Application/Home Page (Google Auth Platform → Branding):

```text
https://unimarket-web.onrender.com
```

Local app home is `http://localhost:3000/`. The completion path `/auth/google/complete` is a React route after the backend callback; do not register it as Google's callback. Keep the existing client ID and secret. Ensure your Google account is listed as a test user if the consent screen is in testing mode.

Google's [server-flow documentation](https://developers.google.com/identity/openid-connect/openid-connect) requires the redirect URI to exactly match the backend endpoint registered on the existing client.

## Local environment

In `Backend/.env`:

```dotenv
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
COOKIE_SAME_SITE=lax
```

Keep `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `MONGO_URL`, SMTP and other existing values. `COOKIE_SAME_SITE=lax` is already the default when unset; the only required local value changed here was `CLIENT_URL`.

Frontend `REACT_APP_API_URL=http://localhost:8000` is optional locally because it is already the development default. If overriding it, place it in ignored `frontend/.env.local`. Never put the Google secret in any `REACT_APP_*` variable.

Restart the backend so it reloads `.env`:

```sh
cd Backend
npm run dev
```

Run/restart the frontend in a separate terminal:

```sh
cd frontend
npm start
```

Use `localhost` consistently rather than mixing it with `127.0.0.1`. Start a fresh Google attempt after restarting; previous state/pending cookies may have expired.

Expected flow: localhost:3000 → localhost:8000/api/auth/google → Google → localhost:8000/api/auth/google/callback → localhost:3000/auth/google/complete → username/email-proof step if needed → profile.

## Render environment and deployment

Backend service (`unimarket-08di.onrender.com`):

```dotenv
NODE_ENV=production
CLIENT_URL=https://unimarket-web.onrender.com
GOOGLE_REDIRECT_URI=https://unimarket-08di.onrender.com/api/auth/google/callback
COOKIE_SAME_SITE=none
```

Retain existing Google client credentials, JWT secret, DB and SMTP settings in the backend Render environment. Configure `TRUST_PROXY_HOPS` for the actual trusted proxy arrangement so rate limits identify clients correctly. No new `BACKEND_URL`/`FRONTEND_URL` variables are needed: this architecture already uses `GOOGLE_REDIRECT_URI`, `CLIENT_URL` and `REACT_APP_API_URL` for those roles.

Frontend static-site service (`unimarket-web.onrender.com`):

```dotenv
REACT_APP_API_URL=https://unimarket-08di.onrender.com
```

Deploy the current code for **both** services. Frontend build: `npm ci && npm run build` from `frontend`, publish `build`. Backend install/start: `npm ci`, `npm start` from `Backend`. Environment-only updates do not add the missing deployed routes; the latest code must be deployed. Preserve the existing SPA rewrite (`/*` → `/index.html`, action Rewrite), which currently serves the completion URL correctly. See [Render rewrite documentation](https://render.com/docs/redirects-rewrites).

Axios already uses `withCredentials: true`; existing CORS/Origin guards allow the configured frontend, and production JWT cookies use Secure/HttpOnly. The separate Render hostnames need `SameSite=None`. Browsers that block third-party cookies may still block this hosting arrangement; use frontend/API custom domains under one site or a same-origin proxy for those browsers. The completion screen now reports session failure instead of silently showing a profile without authentication.

## Verification and remaining manual checks

Automated checks cover local/production URL validation, callback redirects, invalid state, cancellation, failed identity verification, new Google usernames, existing linked users, safe email linking, cookies/session restoration, refresh, logout, and existing signup/login/reset/username behavior. Real Google identity/token transport is mocked; no real Google account was signed into by the test runner. The existing Google credentials were not exchanged/replaced or committed.

After restarting locally, manually select your Google account, complete username/email proof when requested, refresh the profile and log out. After both Render deployments, repeat this test on production and confirm `/api/auth/google/config` returns `enabled: true`. Live Render environment values and Google Cloud Console settings cannot be changed or inspected from this workspace; update them as listed above.

Recorded results for this fix: 77 frontend tests passed (14 suites); 11 backend auth/configuration/saved/worker tests passed; production build and configured frontend lint passed; backend syntax and `git diff --check` passed. Chrome passed Google initiation → backend callback → username completion → profile refresh → logout → existing Google login with the provider mocked, plus the email signup/OTP/login flow and four responsive widths. Credential fingerprints matched before/after, and `Backend/.env` is ignored by Git.
