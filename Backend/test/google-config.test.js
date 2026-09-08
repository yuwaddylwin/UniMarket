import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleConfiguration, googleSettings } from '../src/services/googleConfig.js';
import { cookieOptions } from '../src/services/authSecurity.js';
test('Google configuration separates local and production without changing credentials', () => {
  const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'CLIENT_URL', 'NODE_ENV', 'COOKIE_SAME_SITE'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', CLIENT_URL: 'http://localhost:3000', GOOGLE_REDIRECT_URI: 'http://localhost:8000/api/auth/google/callback', NODE_ENV: 'development', COOKIE_SAME_SITE: 'lax' });
    assert.equal(googleSettings().frontendOrigin, 'http://localhost:3000');
    assert.equal(googleSettings().redirectUri, 'http://localhost:8000/api/auth/google/callback');
    assert.equal(cookieOptions().secure, false);
    process.env.CLIENT_URL = 'https://unimarket-web.onrender.com';
    assert.equal(googleConfiguration().enabled, false);
    assert.match(googleConfiguration().message, /mixes local and hosted/);
    process.env.GOOGLE_REDIRECT_URI = 'https://unimarket-08di.onrender.com/api/auth/google/callback';
    process.env.NODE_ENV = 'production'; process.env.COOKIE_SAME_SITE = 'none';
    assert.equal(googleConfiguration().enabled, true);
    assert.equal(googleSettings().frontendOrigin, 'https://unimarket-web.onrender.com');
    assert.deepEqual(cookieOptions(), { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000';
    assert.equal(googleConfiguration().enabled, false);
    process.env.GOOGLE_REDIRECT_URI = 'invalid';
    assert.equal(googleConfiguration().enabled, false);
    assert.equal(process.env.GOOGLE_CLIENT_ID, 'test-client'); assert.equal(process.env.GOOGLE_CLIENT_SECRET, 'test-secret');
  } finally { for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } }
});
