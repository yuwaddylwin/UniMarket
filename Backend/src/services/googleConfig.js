// URLs are server configuration, never taken from callback query parameters or Host headers.
export function googleSettings() {
  if (![process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI, process.env.CLIENT_URL].every(value => value?.trim())) {
    throw new Error('Google sign-in is not configured on this server.');
  }
  let frontend, callback;
  try { frontend = new URL(process.env.CLIENT_URL); callback = new URL(process.env.GOOGLE_REDIRECT_URI); }
  catch { throw new Error('Google sign-in URLs are not configured correctly.'); }
  const loopback = url => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (![frontend, callback].every(url => ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash) || frontend.pathname !== '/' || callback.pathname !== '/api/auth/google/callback') {
    throw new Error('Configure CLIENT_URL as the frontend origin and GOOGLE_REDIRECT_URI as the /api/auth/google/callback URL.');
  }
  if (loopback(frontend) !== loopback(callback) || (loopback(frontend) && frontend.hostname !== callback.hostname)) {
    throw new Error('Google sign-in mixes local and hosted URLs. Configure both frontend and callback for the same environment.');
  }
  if (process.env.NODE_ENV === 'production' && [frontend, callback].some(url => url.protocol !== 'https:' || loopback(url))) {
    throw new Error('Production Google sign-in requires hosted HTTPS URLs.');
  }
  return { frontendOrigin: frontend.origin, redirectUri: callback.href };
}
export function googleConfiguration() {
  try { googleSettings(); return { enabled: true }; }
  catch (error) { return { enabled: false, message: error.message }; }
}
