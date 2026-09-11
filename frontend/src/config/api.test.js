const original = { mode: process.env.NODE_ENV, url: process.env.REACT_APP_API_URL };
afterEach(() => {
  process.env.NODE_ENV = original.mode;
  if (original.url === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = original.url;
  jest.resetModules();
});
test.each(['https://api.example.com', 'https://api.example.com/', 'https://api.example.com/api/'])('production uses the configured backend for API, OAuth, sockets and uploads: %s', url => {
  process.env.NODE_ENV = 'production'; process.env.REACT_APP_API_URL = url;
  jest.resetModules();
  const api = require('./api');
  expect(api.API_BASE_URL).toBe('https://api.example.com/api');
  expect(api.API_ORIGIN).toBe('https://api.example.com');
  expect(api.resolveApiAssetUrl('/uploads/photo.jpg')).toBe('https://api.example.com/uploads/photo.jpg');
  expect(api.resolveApiAssetUrl('https://res.cloudinary.com/photo')).toBe('https://res.cloudinary.com/photo');
});
test('existing production proxy remains available for rollback', () => {
  process.env.NODE_ENV = 'production'; delete process.env.REACT_APP_API_URL;
  jest.resetModules();
  expect(require('./api').API_BASE_URL).toBe('/api');
});

test('local development uses the local backend without production settings', () => {
  process.env.NODE_ENV = 'development'; delete process.env.REACT_APP_API_URL;
  jest.resetModules();
  expect(require('./api').API_BASE_URL).toBe('http://localhost:8000/api');
});
