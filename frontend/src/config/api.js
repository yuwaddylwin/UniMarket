const DEFAULT_API_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://unimarket-08di.onrender.com"
    : "http://localhost:8000";

const configuredOrigin = (process.env.REACT_APP_API_URL || DEFAULT_API_ORIGIN).replace(/\/$/, "");

// REACT_APP_API_URL may be supplied as either https://host or https://host/api.
export const API_BASE_URL = configuredOrigin.endsWith("/api")
  ? configuredOrigin
  : `${configuredOrigin}/api`;

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export function resolveApiAssetUrl(url, fallback = "") {
  if (!url || typeof url !== "string") return fallback;
  return url.startsWith("/uploads/") ? `${API_ORIGIN}${url}` : url;
}
