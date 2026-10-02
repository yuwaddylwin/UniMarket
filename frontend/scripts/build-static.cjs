// CRA reads .env files at build time; validate the same resolved environment.
process.env.NODE_ENV = "production";
require("react-scripts/config/env");
const value = process.env.REACT_APP_API_URL?.trim();
let url;
try {
  url = new URL(value);
} catch {
  throw new Error(
    "Static builds require REACT_APP_API_URL=https://your-backend-domain (optional /api)."
  );
}
if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.search ||
  url.hash ||
  !["/", "/api", "/api/"].includes(url.pathname) ||
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
) {
  throw new Error(
    "REACT_APP_API_URL must be a hosted HTTPS backend origin, optionally ending in /api."
  );
}
for (const key of Object.keys(process.env)) {
  if (
    /^REACT_APP_/.test(key) &&
    /SECRET|PASSWORD|PRIVATE|MONGO|SMTP|TOKEN/i.test(key)
  ) {
    throw new Error(
      `Remove backend-only variable ${key} from the frontend build environment.`
    );
  }
}
require("react-scripts/scripts/build");
