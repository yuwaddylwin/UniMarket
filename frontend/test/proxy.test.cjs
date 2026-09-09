const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server.cjs');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
test('production proxy preserves APIs, bodies, cookies, redirects, assets and WebSockets', async t => {
  const upstream = http.createServer(async (req, res) => {
    if (req.url.startsWith('/api/auth/google/callback')) {
      res.writeHead(302, { Location: '/auth/google/complete', 'Set-Cookie': ['jwt=test; Path=/; HttpOnly; Secure; SameSite=Lax', 'google_state=; Path=/; Max-Age=0'] }); return res.end();
    }
    if (req.url === '/api/missing') { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"message":"missing"}'); }
    let body = ''; for await (const chunk of req) body += chunk;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: req.url, method: req.method, body, cookie: req.headers.cookie, origin: req.headers.origin, contentType: req.headers['content-type'], forwarded: req.headers['x-forwarded-for'], signature: req.headers['x-unimarket-proxy-signature'], timestamp: req.headers['x-unimarket-proxy-time'] }));
  });
  const wss = new WebSocketServer({ server: upstream });
  wss.on('connection', (ws, req) => ws.on('message', data => ws.send(`${req.headers.cookie}:${data}`)));
  const target = await listen(upstream);
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unimarket-proxy-'));
  fs.writeFileSync(path.join(buildDir, 'index.html'), '<html>UniMarket</html>');
  const proxy = createServer({ target, buildDir, proxySecret: 'isolated-proxy-test-secret' }); const base = await listen(proxy);
  t.after(() => { proxy.closeAllConnections(); proxy.close(); wss.close(); upstream.closeAllConnections(); upstream.close(); fs.rmSync(buildDir, { recursive: true }); });
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await fetch(`${base}/api/test?code=a%2Bb&state=abc`, { method, headers: { Cookie: 'jwt=member', Origin: base, 'Content-Type': 'application/json', 'X-Forwarded-For': 'spoof' }, ...(method === 'GET' ? {} : { body: '{"value":1}' }) });
    const data = await res.json(); assert.equal(data.method, method); assert.equal(data.url, '/api/test?code=a%2Bb&state=abc'); assert.equal(data.cookie, 'jwt=member'); assert.equal(data.origin, base); assert.notEqual(data.forwarded, 'spoof'); assert.equal(data.signature, crypto.createHmac('sha256', 'isolated-proxy-test-secret').update(`${data.timestamp}\n${data.forwarded}\n${method}\n${data.url}`).digest('hex'));  if (method !== 'GET') assert.equal(data.body, '{"value":1}');
  }
  const form = new FormData(); form.append('photo', new Blob(['image bytes']), 'photo.jpg');
  const uploaded = await (await fetch(`${base}/api/upload`, { method: 'POST', body: form })).json();
  assert.match(uploaded.contentType, /multipart\/form-data; boundary=/); assert.match(uploaded.body, /image bytes/);
  const callback = await fetch(`${base}/api/auth/google/callback?code=test&state=test`, { redirect: 'manual' });
  assert.equal(callback.status, 302); assert.equal(callback.headers.get('location'), '/auth/google/complete'); assert.equal(callback.headers.getSetCookie().length, 2); assert.match(callback.headers.getSetCookie()[0], /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  assert.match(await (await fetch(`${base}/auth/google/complete`)).text(), /<html>/);
  assert.match(await (await fetch(base)).text(), /<html>/);
  assert.equal((await (await fetch(`${base}/healthz`)).json()).status, 'ok');
  assert.equal((await (await fetch(`${base}/uploads/photo.jpg`)).json()).url, '/uploads/photo.jpg');
  const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket', { headers: { Cookie: 'jwt=socket' } });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const received = new Promise(resolve => socket.once('message', data => resolve(data.toString()))); socket.send('hello'); assert.equal(await received, 'jwt=socket:hello');
  await new Promise(resolve => { socket.once('close', resolve); socket.close(); });
  upstream.closeAllConnections(); await new Promise(resolve => upstream.close(resolve));
  const unavailable = await fetch(`${base}/api/auth/check`); assert.equal(unavailable.status, 502); assert.match(unavailable.headers.get('content-type'), /json/);
});
