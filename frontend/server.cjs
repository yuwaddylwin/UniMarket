const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { isIP } = require('node:net');

// Keep API paths intact: Express mounts its routes at /api, too.
function createServer({ target = process.env.API_PROXY_TARGET, buildDir = path.join(__dirname, 'build'), proxySecret = process.env.API_PROXY_SECRET } = {}) {
  const upstream = new URL(target || 'http://localhost:8000');
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) throw new Error('API_PROXY_TARGET must be an HTTP(S) origin.');
  if (process.env.NODE_ENV === 'production' && !target) throw new Error('API_PROXY_TARGET is required in production.');
  if (process.env.NODE_ENV === 'production' && (!proxySecret || proxySecret.length < 32)) throw new Error('API_PROXY_SECRET must be at least 32 characters and match the backend.');
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || (process.env.NODE_ENV === 'production' ? 1 : 0));
  if (!Number.isInteger(proxyHops) || proxyHops < 0) throw new Error('TRUST_PROXY_HOPS must be a nonnegative integer.');
  const transport = upstream.protocol === 'https:' ? https : http;
  const isProxy = url => /^\/(api|socket\.io|uploads)(\/|\?|$)/.test(url);
  function headers(req, upgrade = false) {
    const result = { ...req.headers, host: upstream.host };
    // Never pass browser-supplied forwarding chains to the backend.
    for (const key of Object.keys(result)) if (key === 'forwarded' || key.startsWith('x-forwarded-') || key.startsWith('x-unimarket-')) delete result[key];
    const chain = [...(req.headers['x-forwarded-for'] || '').split(',').map(value => value.trim()).filter(Boolean), req.socket.remoteAddress];
    const clientAddress = chain[Math.max(0, chain.length - 1 - proxyHops)];
    result['x-forwarded-for'] = isIP(clientAddress) ? clientAddress : req.socket.remoteAddress;
    result['x-forwarded-proto'] = upstream.protocol.slice(0, -1);
    if (proxySecret) {
      const timestamp = String(Date.now());
      const address = result['x-forwarded-for'];
      result['x-unimarket-client-ip'] = address;
      result['x-unimarket-proxy-time'] = timestamp;
      result['x-unimarket-proxy-signature'] = crypto.createHmac('sha256', proxySecret).update(`${timestamp}\n${address}\n${req.method}\n${req.url}`).digest('hex');
    }
    if (!upgrade) {
      for (const key of (req.headers.connection || '').split(',')) delete result[key.trim().toLowerCase()];
      delete result.connection; delete result.upgrade;
    }
    return result;
  }
  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }
    if (isProxy(req.url)) {
      const request = transport.request(upstream, { path: req.url, method: req.method, headers: headers(req) }, response => {
        // Preserve Location and separate Set-Cookie headers; do not follow OAuth redirects.
        res.writeHead(response.statusCode, { ...response.headers, 'cache-control': req.url.startsWith('/api/') ? 'no-store' : response.headers['cache-control'] || 'no-cache' });
        response.on('error', () => res.destroy());
        response.pipe(res);
      });
      request.setTimeout(60000, () => request.destroy(new Error('Upstream timeout')));
      request.on('error', () => {
        if (res.headersSent) return res.destroy();
        res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ message: 'UniMarket API is temporarily unavailable. Please retry.' }));
      });
      req.on('aborted', () => request.destroy());
      res.on('close', () => { if (!res.writableEnded) request.destroy(); });
      return req.pipe(request);
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); } catch { res.writeHead(400); return res.end(); }
    const root = path.resolve(buildDir);
    let filename = path.resolve(root, `.${pathname}`);
    if ((filename !== root && !filename.startsWith(root + path.sep)) || pathname.includes('\0')) { res.writeHead(404); return res.end(); }
    fs.stat(filename, (error, stat) => {
      if (error || !stat.isFile()) {
        if (path.extname(pathname)) { res.writeHead(404); return res.end(); }
        filename = path.join(root, 'index.html');
      }
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };
      const stream = fs.createReadStream(filename);
      stream.on('error', () => { if (!res.headersSent) res.writeHead(404); res.end(); });
      stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': pathname.startsWith('/static/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
        if (req.method === 'HEAD') { stream.destroy(); res.end(); } else stream.pipe(res);
      });
    });
  });
  server.on('upgrade', (req, socket, head) => {
    if (!/^\/socket\.io(\/|\?)/.test(req.url)) return socket.destroy();
    const request = transport.request(upstream, { path: req.url, headers: headers(req, true) });
    request.on('upgrade', (response, remote, remoteHead) => {
      socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`);
      for (let i = 0; i < response.rawHeaders.length; i += 2) socket.write(`${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}\r\n`);
      socket.write('\r\n');
      if (remoteHead.length) socket.write(remoteHead);
      if (head.length) remote.write(head);
      remote.on('error', () => socket.destroy()); socket.on('error', () => remote.destroy());
      socket.on('close', () => remote.destroy()); remote.on('close', () => socket.destroy());
      remote.pipe(socket).pipe(remote);
    });
    request.on('response', response => { response.resume(); socket.end(`HTTP/1.1 ${response.statusCode} Rejected\r\nConnection: close\r\n\r\n`); });
    request.on('error', () => socket.destroy());
    socket.on('error', () => request.destroy());
    request.end();
  });
  return server;
}
if (require.main === module) createServer().listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('UniMarket frontend listening'));
module.exports = { createServer };
