import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
// Execute the real service worker with browser API doubles. No application data
// or delivery endpoints are mocked in production; these tests cover click/privacy semantics.
test("service worker deduplicates delivery, routes clicks and rejects another account", async () => {
  const handlers = {},
    cacheEntries = new Map(),
    shown = [],
    opened = [];
  const cache = {
    match: async (key) =>
      cacheEntries.get(
        typeof key === "string" ? key : new URL(key.url).pathname
      ),
    put: async (key, value) => cacheEntries.set(key, value),
    keys: async () =>
      [...cacheEntries.keys()].map((key) => ({
        url: `https://unimarket.test${key}`,
      })),
    delete: async (key) => cacheEntries.delete(new URL(key.url).pathname),
  };
  const context = {
    URL,
    Response: class {
      constructor(body) {
        this.body = body;
      }
      async json() {
        return JSON.parse(this.body);
      }
    },
    caches: { open: async () => cache },
    self: {
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      skipWaiting() {},
      location: { origin: "https://unimarket.test" },
      registration: {
        showNotification: async (title, options) =>
          shown.push({ title, ...options }),
        getNotifications: async () => [],
      },
      clients: {
        claim() {},
        matchAll: async () => [],
        openWindow: async (url) => opened.push(url),
      },
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      new URL("../../frontend/public/chat-sw.js", import.meta.url),
      "utf8"
    ),
    context
  );
  const event = async (type, payload) => {
    const tasks = [];
    handlers[type]({ ...payload, waitUntil: (task) => tasks.push(task) });
    await Promise.all(tasks);
  };
  await event("message", { data: { type: "USER", userId: "alice" } });
  const payload = {
    id: "111111111111111111111111",
    userId: "alice",
    title: "New message",
    url: "/chat/222222222222222222222222",
  };
  await event("push", { data: { json: () => payload } });
  await event("push", { data: { json: () => payload } });
  assert.equal(shown.length, 1);
  await event("notificationclick", {
    notification: { data: shown[0].data, close() {} },
  });
  assert.equal(opened[0], `https://unimarket.test${payload.url}`);
  await event("message", { data: { type: "USER", userId: "bob" } });
  await event("push", {
    data: { json: () => ({ ...payload, id: "333333333333333333333333" }) },
  });
  assert.equal(shown.length, 1);
  await event("notificationclick", {
    notification: { data: shown[0].data, close() {} },
  });
  assert.equal(opened[1], "https://unimarket.test/chat");
  await event("push", {
    data: {
      json: () => ({
        ...payload,
        id: "444444444444444444444444",
        userId: "bob",
        url: "https://evil.test",
      }),
    },
  });
  assert.equal(shown[1].data.url, "/chat");
});
