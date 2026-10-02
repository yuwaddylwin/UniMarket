/* Web Push only: this worker never caches authenticated API responses. */
const STATE_CACHE = "unimarket-push-state-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "USER")
    event.waitUntil(
      (async () => {
        const cache = await caches.open(STATE_CACHE);
        await cache.put(
          "/__push_user",
          new Response(JSON.stringify(event.data.userId || null))
        );
        if (!event.data.userId)
          for (const notification of await self.registration.getNotifications())
            notification.close();
      })()
    );
});
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let data;
      try {
        data = event.data.json();
      } catch {
        return;
      }
      const cache = await caches.open(STATE_CACHE),
        stored = await cache.match("/__push_user");
      const userId = stored ? await stored.json() : null;
      if (!userId || data.userId !== userId || !/^[a-f0-9]{24}$/i.test(data.id))
        return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (
        windows.some(
          (client) =>
            client.visibilityState === "visible" &&
            client.focused &&
            /^\/chat(?:\/|$)/.test(new URL(client.url).pathname)
        )
      )
        return;
      // A stable notification ID deduplicates retries, including across worker restarts.
      if (await cache.match(`/__push_seen/${data.id}`)) return;
      const url =
        typeof data.url === "string" &&
        /^\/(chat(?:\/[a-f0-9]{24})?)$/i.test(data.url)
          ? data.url
          : "/chat";
      await self.registration.showNotification(
        data.title || "New UniMarket message",
        {
          body: data.body,
          icon: "/unimarket-192.png",
          badge: "/unimarket-32.png",
          tag: `unimarket-${data.id}`,
          renotify: false,
          data: { url, userId },
        }
      );
      await cache.put(`/__push_seen/${data.id}`, new Response("1"));
      const keys = (await cache.keys()).filter((key) =>
        key.url.includes("/__push_seen/")
      );
      for (const key of keys.slice(0, Math.max(0, keys.length - 200)))
        await cache.delete(key);
    })()
  )
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATE_CACHE),
        stored = await cache.match("/__push_user");
      const sameUser =
        stored && (await stored.json()) === event.notification.data.userId;
      const path = sameUser ? event.notification.data.url : "/chat";
      const url = new URL(path, self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = windows.find(
        (item) => new URL(item.url).origin === self.location.origin
      );
      if (client) {
        await client.navigate(url);
        await client.focus();
      } else await self.clients.openWindow(url);
    })()
  );
});
