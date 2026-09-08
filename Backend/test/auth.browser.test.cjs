// Run only with auth-browser-server.js and a build using REACT_APP_API_URL=http://localhost:8028.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const WS = require('../../frontend/node_modules/ws');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
 const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=9238', `--user-data-dir=${fs.mkdtempSync('/private/tmp/unimarket-auth-chrome-')}`, 'about:blank'], { stdio: 'ignore' });
 let ws;
 try {
  let tabs;
  for (let i = 0; i < 100; i++) { try { tabs = await (await fetch('http://127.0.0.1:9238/json')).json(); if (tabs.length) break; } catch {} await pause(100); }
  ws = new WS(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl); await new Promise(resolve => ws.once('open', resolve));
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
  ws.on('message', raw => { const data = JSON.parse(raw); if (data.id) { const task = pending.get(data.id); data.error ? task.reject(data.error) : task.resolve(data.result); pending.delete(data.id); } });
  await send('Page.enable'); await send('Runtime.enable');
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result?.value; };
  const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw Error(`Timed out: ${expression}; ${await evaluate('document.body.innerText')}`); };
  const navigate = async route => { await send('Page.navigate', { url: `http://localhost:8728${route}` }); await until("!!document.querySelector('.auth-card')"); };
  const fill = async fields => evaluate(`{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [id,value] of ${JSON.stringify(fields)}){const input=document.getElementById(id);setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}}`);
  for (const width of [1440, 768, 390, 320]) {
   await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
   for (const route of ['/signup', '/login', '/verify-code', '/forgot-password']) {
    await navigate(route); await pause(450);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${route} overflows at ${width}`);
    assert.equal(await evaluate("[...document.querySelectorAll('.auth-card input,.auth-card button,.auth-card .logo')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})"), true);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(`/private/tmp/unimarket-auth-${route.slice(1)}-${width}.png`, Buffer.from(shot.data, 'base64'));
   }
  }
  await navigate('/signup');
  const email = `browser${Date.now()}@example.test`, username = `browser_${Date.now()}`;
  await fill([['signup-name','Browser User'],['auth-username',username],['signup-email',email],['signup-password','browser-password'],['signup-confirm','browser-password']]);
  await evaluate("document.querySelector('.auth-fields').requestSubmit()"); await until("location.pathname==='/verify-code'");
  const code = (await (await fetch(`http://127.0.0.1:8028/test-mail/${email}`)).json()).code;
  assert.match(code, /^\d{6}$/); await fill([['auth-code', code]]); await evaluate("document.querySelector('.auth-fields').requestSubmit()"); await until("location.pathname==='/profile'");
  assert.equal(await evaluate("localStorage.getItem('authToken')"), null);
  assert.equal(await evaluate("document.cookie.includes('jwt=')"), false);
  const me = await evaluate("fetch('http://localhost:8028/api/auth/me',{credentials:'include'}).then(r=>r.json())"); assert.equal(me.username, username);
  await send('Page.navigate', { url: 'http://localhost:8728/profile/settings' }); await until("document.body.innerText.includes('Your username is permanent')");
  assert.equal(await evaluate("document.body.innerText.includes('@'+"+JSON.stringify(username)+")"), true);
  const logout = await evaluate("fetch('http://localhost:8028/api/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)"); assert.equal(logout, 200);
  assert.equal(await evaluate("fetch('http://localhost:8028/api/auth/me',{credentials:'include'}).then(r=>r.status)"), 401);
  await navigate('/login'); await fill([['login-identifier',username],['login-password','browser-password']]); await evaluate("document.querySelector('.auth-fields').requestSubmit()"); await until("location.pathname==='/'");
  assert.equal(await evaluate("fetch('http://localhost:8028/api/auth/me',{credentials:'include'}).then(r=>r.status)"), 200);
  if (process.env.UNIMARKET_GOOGLE_PREVIEW === 'mock') {
    // Intercept ONLY the external provider in this disposable test; backend state,
    // callback processing, cookies, pending username, and React routes are real.
    ws.on('message', async raw => {
      const data = JSON.parse(raw);
      if (data.method !== 'Fetch.requestPaused') return;
      const url = new URL(data.params.request.url);
      const callback = new URL(url.searchParams.get('redirect_uri'));
      callback.searchParams.set('state', url.searchParams.get('state'));
      callback.searchParams.set('code', url.searchParams.get('nonce'));
      await send('Fetch.fulfillRequest', { requestId: data.params.requestId, responseCode: 302, responseHeaders: [{ name: 'Location', value: callback.href }] });
    });
    await send('Fetch.enable', { patterns: [{ urlPattern: 'https://accounts.google.com/*', requestStage: 'Request' }] });
    await navigate('/login'); await until("!!document.querySelector('.google-button:not(:disabled)')");
    await evaluate("document.querySelector('.google-button').click()");
    await until("location.pathname==='/auth/google/complete' && !!document.getElementById('auth-username')");
    await fill([['auth-username', 'browser_google']]);
    await evaluate("document.querySelector('.auth-fields').requestSubmit()");
    await until("location.pathname==='/profile'");
    await send('Page.reload'); await until("document.body.innerText.includes('@browser_google')");
    await evaluate("fetch('http://localhost:8028/api/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'})");
    await navigate('/login'); await until("!!document.querySelector('.google-button:not(:disabled)')");
    await evaluate("document.querySelector('.google-button').click()"); await until("location.pathname==='/profile'");
    assert.equal(await evaluate("fetch('http://localhost:8028/api/auth/me',{credentials:'include'}).then(r=>r.json()).then(u=>u.username)"), 'browser_google');
    console.log('PASS: browser Google initiation → backend callback → username completion → refresh → logout → existing Google login (provider transport mocked).');
  }
  console.log('PASS: four auth routes at 1440/768/390/320px; real browser signup → OTP → profile/settings → logout → username login; HTTP-only cookie and no localStorage token.');
 } finally { ws?.close(); chrome.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
