# UniMarket frontend

Create React App SPA. See [Render static deployment](../docs/render-static-site.md) for architecture, settings, safe preview, rollback and testing.

- Local development: `npm install`, then `npm start` (backend defaults to port 8000).
- Render Static Site: set public `REACT_APP_API_URL`, then `npm ci && npm run build:static`; publish `build`.
- Standard build: `npm run build` validates the public backend URL, just like `build:static`.
- Legacy Web Service only: omit REACT_APP_API_URL, run `npm run build:proxy`, then `npm run start:production`; uses server-only `API_PROXY_TARGET` and `API_PROXY_SECRET`.
- Tests: `CI=true npm test -- --watchAll=false --runInBand`.

The static site has no start command and never runs `server.cjs`. Build-time API changes require rebuilding.
