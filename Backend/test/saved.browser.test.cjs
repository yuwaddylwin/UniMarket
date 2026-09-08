// Run with SAVED_TEST_MONGO_URL=mongodb://127.0.0.1:27183/saved_browser_test
// and a frontend build at SAVED_BROWSER_BUILD, configured for http://localhost:8018.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const WS = require('../../frontend/node_modules/ws');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const backend = path.resolve(__dirname, '..');
const uri = process.env.SAVED_TEST_MONGO_URL;
const build = process.env.SAVED_BROWSER_BUILD;
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!uri || !build) { console.log('Saved browser test skipped: provide an isolated database and test build.'); process.exit(0); }
assert.match(uri || '', /^mongodb:\/\/127\.0\.0\.1:\d+\/saved_browser_test$/);
assert.ok(build && fs.existsSync(path.join(build, 'index.html')));
const children = [];
let web, ws;
(async () => {
  const model = async filename => (await import(pathToFileURL(path.join(backend, 'src/models', filename)))).default;
  const [User, Item, Accommodation, Saved] = await Promise.all(['user.model.js', 'ItemsList.model.js', 'Accommodation.model.js', 'savedListing.model.js'].map(model));
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  const password = 'Saved-browser-test-123';
  const users = await User.create(['reader', 'seller'].map(name => ({ fullName: `Test ${name}`, username: `test_${name}`, email: `${name}@saved.example.test`, password: bcrypt.hashSync(password, 4), verified: true, preferences: { browserPush: false, messages: false } })));
  const common = { user: users[1]._id, description: 'Saved browser verification', price: 700, seller: { id: users[1]._id, fullName: users[1].fullName } };
  const item = await Item.create({ ...common, title: 'Test refrigerator', category: 'Furniture' });
  const stay = await Accommodation.create({ ...common, title: 'Test studio', location: 'Near campus', accommodationType: 'Studio', pricePeriod: 'month' });
  const backendLog = [];
  const api = spawn(process.execPath, ['index.js'], { cwd: backend, env: { ...process.env, PORT: '8018', CLIENT_URL: 'http://localhost:8719', MONGO_URL: uri, JWT_SECRET: 'saved-browser-isolated-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(api);
  api.stdout.on('data', data => backendLog.push(String(data)));
  api.stderr.on('data', data => backendLog.push(String(data)));
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch('http://localhost:8018/api/saved')).status === 401) break; } catch {}
    assert.ok(attempt < 100, 'Isolated backend failed to start'); await pause(100);
  }
  web = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const filename = pathname.includes('.') ? path.join(build, pathname) : path.join(build, 'index.html');
    if (!filename.startsWith(build) || !fs.existsSync(filename)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.png') ? 'image/png' : filename.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
    fs.createReadStream(filename).pipe(res);
  });
  await new Promise(resolve => web.listen(8719, resolve));
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=9235', `--user-data-dir=${fs.mkdtempSync('/private/tmp/unimarket-save-real-browser-')}`, 'about:blank'], { stdio: 'ignore' });
  children.push(chrome);
  let tabs;
  for (let attempt = 0; ; attempt++) {
    try { tabs = await (await fetch('http://127.0.0.1:9235/json')).json(); if (tabs.length) break; } catch {}
    assert.ok(attempt < 100, 'Browser failed to start'); await pause(100);
  }
  ws = new WS(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.once('open', resolve));
  let serial = 0; const pending = new Map(), consoleErrors = [], networkErrors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Browser command timed out: ${method}`));},10000); pending.set(id, { resolve:value=>{clearTimeout(timer);resolve(value)}, reject:error=>{clearTimeout(timer);reject(error)} }); ws.send(JSON.stringify({ id, method, params }));
  });
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id) { const task = pending.get(msg.id); msg.error ? task?.reject(msg.error) : task?.resolve(msg.result); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(msg.params.args.map(arg => arg.value || arg.description).join(' '));
    if (msg.method === 'Network.responseReceived' && msg.params.response.url.includes('/api/') && msg.params.response.status >= 400) networkErrors.push({ url: msg.params.response.url, status: msg.params.response.status });
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result?.value;
  };
  const until = async expression => {
    for (let count = 0; count < 100; count++) { if (await evaluate(expression)) return; await pause(100); }
    console.error(JSON.stringify({ consoleErrors, networkErrors, page: await evaluate("document.body.innerText"), backendLog }));
    const screenshot=await send("Page.captureScreenshot",{format:"png"});fs.writeFileSync("/private/tmp/unimarket-save-test-failure.png",Buffer.from(screenshot.data,"base64"));
    throw new Error(`Timed out: ${expression}`);
  };
  const navigate = async route => { await send('Page.navigate', { url: `http://localhost:8719${route}` }); };
  const click = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"center",behavior:"instant"})`);
    await pause(250);
    const rect = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...rect, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...rect, button: 'left', clickCount: 1 });
  };
  const login = async () => {
    await navigate('/login'); await until("!!document.querySelector('#login-identifier')");
    await evaluate(`{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [id,value] of [['login-identifier','reader@saved.example.test'],['login-password',${JSON.stringify(password)}]]){const input=document.getElementById(id);setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}}`);
    await evaluate("document.querySelector('.auth-fields').requestSubmit()");
    await until("location.pathname==='/'");
  };
  const selector = '.listing-feed-actions .save-listing-button';
  let mobile = false;
  const results = [];
  for (const width of [1440, 390]) {
    mobile = width === 390;
    await send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await login();
    for (const [type, listing, route] of [['item', item, 'products'], ['accommodation', stay, 'accommodations']]) {
      await navigate(`/${route}/${listing._id}`);
      await until(`!!document.querySelector('${selector}') && !document.querySelector('${selector}').disabled`);
      assert.equal(await evaluate(`document.querySelector('${selector}').textContent`), 'Save');
      await click(selector);
      await until(`document.querySelector('${selector}').getAttribute('aria-pressed')==='true' && !document.querySelector('${selector}').disabled`);
      assert.equal(await Saved.countDocuments({ user: users[0]._id, listingType: type }), 1);
      await send('Page.reload');
      await until(`document.querySelector('${selector}')?.getAttribute('aria-pressed')==='true'`);
      await navigate('/saved'); await until(`document.querySelectorAll('.saved-page li').length===1`);
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
      await click('button[aria-label="Open menu"]');
      await until("!!document.querySelector('.navbar-logout')");
      await evaluate("document.querySelector('.navbar-logout').click()");
      await until("fetch('http://localhost:8018/api/auth/me',{credentials:'include'}).then(r=>r.status===401)");
      await login();
      await navigate(`/${route}/${listing._id}`);
      await until(`document.querySelector('${selector}')?.getAttribute('aria-pressed')==='true' && !document.querySelector('${selector}').disabled`);
      await click(selector);
      await until(`document.querySelector('${selector}').getAttribute('aria-pressed')==='false' && !document.querySelector('${selector}').disabled`);
      assert.equal(await Saved.countDocuments({ user: users[0]._id, listingType: type }), 0);
      assert.equal(await evaluate(`document.querySelector('${selector}').textContent`), 'Save');
      await navigate(`/${route}`);
      const cardSelector = type === 'item' ? '.item-card .save-listing-button' : '.accommodation-card .save-listing-button';
      await until(`!!document.querySelector('${cardSelector}') && !document.querySelector('${cardSelector}').disabled`);
      await click(cardSelector);
      await until(`document.querySelector('${cardSelector}').getAttribute('aria-pressed')==='true' && !document.querySelector('${cardSelector}').disabled`);
      assert.equal(await evaluate('location.pathname'), `/${route}`);
      await navigate('/saved');
      await until("document.querySelectorAll('.saved-page li').length===1");
      await click('.saved-page .save-listing-button');
      await until("!!document.querySelector('.safety-dialog[open]')");
      assert.equal(await Saved.countDocuments({user:users[0]._id}),1);
      await click('.safety-dialog button[type="button"]');
      await until("!document.querySelector('.safety-dialog')");
      assert.equal(await Saved.countDocuments({user:users[0]._id}),1);
      await click('.saved-page .save-listing-button');
      await until("!!document.querySelector('.safety-dialog[open]')");
      await click('.safety-dialog button[type="submit"]');
      await until("document.querySelectorAll('.saved-page li').length===0 && !document.querySelector('.safety-dialog')");
      for (let i=0; i<100 && await Saved.countDocuments({user:users[0]._id}); i++) await pause(50);
      assert.equal(await Saved.countDocuments({user:users[0]._id}),0);
      results.push({ width, type, save: true, refresh: true, relogin: true, unsave: true, gridSave: true, savedPageUnsave: true });
      console.log(`Verified ${type} at ${width}px`);
    }
  }
  assert.deepEqual(consoleErrors, []); assert.deepEqual(networkErrors, []);
  assert.ok(!backendLog.some(line => /error|failed/i.test(line)), backendLog.join(''));
  console.log(JSON.stringify({ results, consoleErrors, networkErrors, backendErrors: [] }));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  ws?.close(); web?.closeAllConnections(); web?.close();
  children.forEach(child => child.kill('SIGTERM'));
  if (mongoose.connection.readyState === 1) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
