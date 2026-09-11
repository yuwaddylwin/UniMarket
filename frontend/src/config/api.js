const DEFAULT_API_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "/api"
    : "http://localhost:8000";

const configuredOrigin = (process.env.REACT_APP_API_URL?.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, "");

// One public backend URL drives Axios, OAuth navigation, sockets and uploaded assets.
// An unset production URL preserves the existing Web Service proxy for rollback.
export const API_BASE_URL = configuredOrigin.endsWith("/api")
  ? configuredOrigin
  : `${configuredOrigin}/api`;

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export function resolveApiAssetUrl(url, fallback = "") {
  if (!url || typeof url !== "string") return fallback;
  return url.startsWith("/uploads/") ? `${API_ORIGIN}${url}` : url;
}
