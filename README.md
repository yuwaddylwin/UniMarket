# UniMarket

UniMarket is a student marketplace for second-hand items, accommodation, saved
listings, profiles, and real-time messaging. Administrators review reports and
moderate accounts and listings.

The frontend uses React 19, React Router, Zustand, Axios, and Create React App.
The backend uses Express 5, MongoDB/Mongoose, Socket.IO, Cloudinary, SMTP, and
email verification. Each application has its own package manifest and lockfile.

## Project structure

```text
Backend/
  index.js                 HTTP middleware, database startup, workers
  src/
    routes/                API endpoints and middleware order
    controllers/           Authentication, listings, messages, moderation actions
    models/                Mongoose schemas and indexes
    services/              Validation, authorization, notifications, migrations
    middleware/            Authentication and uploads
    lib/                   Socket.IO and Cloudinary integration
    utils/                 Email delivery
  scripts/                 Explicit maintenance commands
  test/                    Unit and database integration tests
frontend/
  src/
    App.js                 Browser routes and session restoration
    Components/            Feature UI, with styles and component tests nearby
      Admin/               Dashboard, filters, moderation dialog, shared UI
      Items/               Item lists, cards, carousel, and details
      Accommodation/       Accommodation lists and details
      Chat/                Conversations and browser push integration
      Profile/             Account pages and sign-in/sign-up forms
      common/              Shared UI and listing presentation helpers
    hooks/                 Listing requests and sell-form logic
    store/                 Authentication, chat, and saved-listing Zustand stores
    lib/                   Shared Axios client
    layouts/               Shared page layout
    pages/                 Verification, guide, legal pages
    config/                API URLs, navigation, contact details
  public/                  Images, icons, manifest, chat service worker
  server.cjs               Optional legacy production proxy
  test/                    Proxy integration test
  scripts/                 Static build validation
```

Start with [the architecture guide](docs/architecture.md) for feature ownership,
API boundaries, and behavior that refactors must preserve. Tests stay next to
frontend modules; backend integration tests live in `Backend/test`.

## Local development

Use Node.js 22 or later. You also need npm and MongoDB with a replica set (local or Atlas); chat and
moderation use transactions. A standalone MongoDB instance is insufficient.

1. Run `npm ci` in both `Backend` and `frontend`.
2. For a new setup, copy `Backend/.env.example` to `Backend/.env` and fill in the
   credentials. Keep an existing `.env` intact. The frontend template is optional
   for local development.
3. Run `npm run dev` from `Backend` and `npm start` from `frontend` in separate
   terminals. Defaults are backend port 8000 and frontend port 3000.
4. Open `http://localhost:3000`. `/healthz` on the backend reports database readiness.

The example database URI assumes a replica set named `rs0`; use your own
**development** replica-set URI if different. Startup initializes indexes and
runs username/report migrations before accepting requests.

### Environment variables

The complete safe templates are [Backend/.env.example](Backend/.env.example) and
[frontend/.env.example](frontend/.env.example). No template contains credentials.

| Backend settings                                                       | Purpose                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `MONGO_URL`, `JWT_SECRET`                                              | Database and session signing; required for normal operation      |
| `NODE_ENV`, `PORT`, `CLIENT_URL`                                       | Runtime mode, listening port, allowed frontend origin            |
| `COOKIE_SAME_SITE`, `TRUST_PROXY_HOPS`                                 | Cookie policy and exact number of trusted proxy hops             |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Listing, profile, and chat image uploads                         |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`       | Verification and password-reset email                            |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`               | Optional browser push notifications                              |
| `API_PROXY_SECRET`                                                     | Optional legacy proxy request signing; match the frontend server |

For local HTTP, use `NODE_ENV=development`, `CLIENT_URL=http://localhost:3000`,
`COOKIE_SAME_SITE=lax`.

The only application-specific public frontend setting is `REACT_APP_API_URL`.
Omitting it locally selects `http://localhost:8000/api`. Never place credentials
in `REACT_APP_` settings: they are embedded in the browser bundle. API URL changes
require rebuilding the frontend. Local environment files are ignored by Git.

## Frontend/backend communication

`frontend/src/config/api.js` supplies the API origin for Axios, sockets, and uploaded assets. `frontend/src/lib/axios.js` sends credentials
and rejects unexpected HTML responses. Backend routes are mounted under `/api`;
Socket.IO uses the same backend server.

Sessions use HttpOnly JWT cookies with session-version checks. Legacy bearer-token
handling remains for compatibility. Preserve origin checks, cookie settings,
and middleware order when extending authentication.
See [the architecture guide](docs/architecture.md) for the endpoint map.

## Deployment

Backend: root `Backend`, install with `npm ci`, start with `npm start`.

Static frontend: root `frontend`, set public `REACT_APP_API_URL` to the hosted
HTTPS backend origin (optionally ending in `/api`), run `npm ci && npm run build`,
and publish `build`. Configure an SPA rewrite from `/*` to `/index.html`.
`render.yaml` describes an optional new static preview; it does not manage the
existing backend. Static hosting does not run `frontend/server.cjs`.

The retained proxy deployment uses `npm run build:proxy` with
`REACT_APP_API_URL` omitted, followed by `npm run start:production`.
`API_PROXY_TARGET` and matching backend/frontend `API_PROXY_SECRET` values remain
server-only settings. Preserve the deployment's `TRUST_PROXY_HOPS` value.

Production uses `NODE_ENV=production`. Preserve `CLIENT_URL`,
and `COOKIE_SAME_SITE`.
Cross-site hosts require secure `SameSite=None` cookies and browser support for
third-party cookies; same-site HTTPS domains or the existing proxy avoid that
dependency. Socket.IO currently runs on one backend server. Retain stable VAPID
keys and serve `/chat-sw.js` from the frontend origin.

## Maintenance

Run these from `Backend` only when needed:

- `npm run migrate:usernames`: migrate legacy usernames.
- `node scripts/set-admin.js existing-verified-email`: assign an administrator.
- `node scripts/audit-chat-blocks.js`: inspect chat block data.
- `node scripts/configure-push.js`: configure missing local push keys.

## Verification

From `frontend`:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run lint
npm run test:proxy
npm run build
```

The static build needs the public HTTPS `REACT_APP_API_URL` described above.
`npm run build:proxy` verifies the alternative proxy build. There is no separate
TypeScript check; this is a JavaScript project. The backend has no compilation step.

From `Backend`, `npm test` runs unit checks and skips database suites unless their
explicit test URLs are supplied. For full coverage, start an isolated MongoDB
replica set on `127.0.0.1:27029`, with an empty directory of your choosing:

```sh
mongod --dbpath /absolute/path/to/test-db --replSet chatTest --bind_ip 127.0.0.1 --port 27029
```

Initialize it **before** running the tests, then wait until it is writable:

```sh
mongosh 'mongodb://127.0.0.1:27029/?directConnection=true' --eval 'rs.initiate({_id:"chatTest",members:[{_id:0,host:"127.0.0.1:27029"}]})'
mongosh 'mongodb://127.0.0.1:27029/?directConnection=true' --eval 'db.hello().isWritablePrimary'
```

When the last command returns `true`, run from `Backend`:

```sh
CHAT_TEST_MONGO_URL=mongodb://127.0.0.1:27029 \
AUTH_TEST_MONGO_URL=mongodb://127.0.0.1:27029/auth_test \
SAVED_TEST_MONGO_URL=mongodb://127.0.0.1:27029/saved_test \
node --test --test-concurrency=1 test/*.test.js
```

These suites clear their dedicated test databases. Never use production data.
Email and push transports are mocked; listing upload tests mock Cloudinary.
Formatting follows `.prettierrc.json`; use Prettier 3.6.2 without changing the
application's dependency versions.

See [cleanup notes](docs/cleanup-notes.md) for the scope, verification results,
and remaining issues from the handover review.

## Email authentication

Registration keeps the existing name, permanent username, email, and password
fields. The account remains pending until the user enters the emailed six-digit
PIN or opens its verification link. Both expire after 10 minutes; consuming one
invalidates both. Codes and link tokens are stored as keyed hashes, with five
PIN attempts, a 60-second resend cooldown, and IP/account request limits.
PIN verification signs in using the existing HttpOnly JWT cookie. Link verification
activates the account and offers a return to login. An unverified login opens the
verification page without creating a session.

Configure server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`EMAIL_FROM`, and `CLIENT_URL` using your transactional provider. No new provider
or frontend secret is needed. Use a verified sender and a publicly reachable HTTPS
`CLIENT_URL` in production. Keep the existing `JWT_SECRET` to preserve sessions.

No data migration is required. The existing `verified` field and challenge
collection are reused; challenges gain a hashed link token. Existing users and
outstanding legacy verification links remain supported. Existing accounts without
a password can use **Forgot password?** with their verified email to set one.
Unused historical identity fields/indexes can remain in MongoDB without affecting
accounts; do not run a destructive migration or index synchronization.

Locally, configure SMTP, start both apps, register at `/signup`, then use the PIN
or link delivered to your inbox. Test wrong/expired PINs, resend after 60 seconds,
login by username and email, logout, and a protected page such as `/profile`.
Use a second registration to test the alternate verification method. Automated
authentication tests use an isolated `auth_test` database and mocked SMTP as
shown above; they do not prove live email delivery.

Deploy backend and rebuilt frontend together. Remove the retired provider's
client ID, client secret, and redirect URI from the hosting environment. Preserve
all other deployment, cookie, database, and upload settings. After deployment,
register a test account and confirm actual inbox delivery, PIN verification,
link verification, and session persistence on the hosted domains. Live production
email delivery must be checked against the deployed SMTP provider.

### Troubleshooting verification delivery

Run `npm run check:email` from `Backend` to check the SMTP connection and login
without sending an email. It exits nonzero on failure and prints safe diagnostic
categories, never credentials, recipient addresses, PINs, or provider responses.
Brevo SMTP status 525 with `ip_not_authorized` means the backend's outbound IP
must be authorized in the provider's security settings. A local computer and a
hosted backend have different outbound IPs. Do not disable the security policy.
Use the provider's SMTP login/key for `SMTP_USER`/`SMTP_PASS`.

For local development, set `CLIENT_URL=http://localhost:3000` in `Backend/.env`;
keep the hosted HTTPS frontend origin in the production environment. Restart the
backend after changing environment variables. CORS and JWT cookie settings do not
need changing to repair an SMTP rejection.

A logged-out `/api/auth/check` returning 401 is expected. Signup and resend are
public endpoints. Actual SMTP failures return 502 with `EMAIL_DELIVERY_FAILED`;
missing/invalid server email configuration returns 503 with the same safe code.
The new account stays pending and the verification page offers resend. Failed
resends restore the previous valid challenge instead of invalidating a delivered
code. Check server logs for the diagnostic category and provider-side correction.
