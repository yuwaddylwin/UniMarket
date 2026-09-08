import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../src/models/user.model.js';
import Item from '../src/models/ItemsList.model.js';
import Accommodation from '../src/models/Accommodation.model.js';
import SavedListing from '../src/models/savedListing.model.js';
import savedRoutes from '../src/routes/saved.route.js';

// Only use an explicitly supplied, isolated test database.
const uri = process.env.SAVED_TEST_MONGO_URL;
test('saved listings persist, isolate accounts, and prevent duplicates for both listing types', { skip: !uri }, async () => {
  assert.match(uri, /saved_test(?:[/?]|$)/);
  process.env.JWT_SECRET = 'saved-listings-test-secret';
  await mongoose.connect(uri);
  const app = express();
  app.use(express.json());
  app.use('/saved', savedRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const request = async (user, method, path) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/saved${path}`, {
      method, headers: user ? { Authorization: `Bearer ${jwt.sign({ userId: user._id }, process.env.JWT_SECRET)}` } : {},
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
  try {
    await mongoose.connection.dropDatabase();
    await SavedListing.init();
    const [a, b] = await User.create([
      { fullName: 'Saved A', username: 'saved_a', email: 'saved-a@example.test', password: 'password', verified: true },
      { fullName: 'Saved B', username: 'saved_b', email: 'saved-b@example.test', password: 'password', verified: true },
    ]);
    const item = await Item.create({ title: 'Desk', category: 'Furniture', description: 'Desk', price: 500, user: b._id });
    const stay = await Accommodation.create({ title: 'Studio', location: 'Campus', description: 'Room', price: 5000, accommodationType: 'Studio', user: b._id });
    const path = `/item/${item._id}`;
    assert.equal((await request(null, 'GET', '/')).status, 401);
    assert.equal((await request(a, 'PUT', '/unknown/' + item._id)).status, 400);
    assert.equal((await request(a, 'PUT', '/item/invalid')).status, 400);
    const results = await Promise.all(Array.from({ length: 6 }, () => request(a, 'PUT', path)));
    assert.ok(results.every(result => result.status === 200));
    assert.equal(await SavedListing.countDocuments({ user: a._id }), 1);
    assert.equal((await request(a, 'PUT', `/accommodation/${stay._id}`)).status, 200);
    // A fresh signed request represents a new login/session, reading durable records.
    const saved = (await request(a, 'GET', '/')).data;
    assert.equal(saved.length, 2);
    assert.deepEqual(new Set(saved.map(entry => entry.listingType)), new Set(['item', 'accommodation']));
    assert.ok(saved.every(entry => entry.listing.title));
    assert.equal((await request(b, 'GET', '/')).data.length, 0);
    await request(b, 'DELETE', path);
    assert.equal((await request(a, 'GET', '/')).data.length, 2);
    await request(b, 'PUT', path);
    await request(a, 'DELETE', path);
    await request(a, 'DELETE', path);
    assert.equal((await request(a, 'GET', '/')).data.length, 1);
    assert.equal((await request(b, 'GET', '/')).data.length, 1);
    await Accommodation.updateOne({ _id: stay._id }, { moderationStatus: 'hidden' });
    assert.equal((await request(a, 'GET', '/')).data[0].listing, null);
    assert.equal((await request(a, 'PUT', `/accommodation/${stay._id}`)).status, 404);
    await request(a, 'DELETE', `/accommodation/${stay._id}`);
    assert.equal((await request(a, 'GET', '/')).data.length, 0);
    await Item.deleteOne({ _id: item._id });
    assert.equal((await request(b, 'GET', '/')).data[0].listing, null);
    await request(b, 'DELETE', path);
    assert.equal(await SavedListing.countDocuments(), 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
