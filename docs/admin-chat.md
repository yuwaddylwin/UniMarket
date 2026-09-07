# UniMarket administration and chat alerts

The standalone Notifications feature has been removed. There is no notification inbox, bell, general notification settings, marketing preference, general notification API or moderation push. Reports and account restrictions remain part of moderation; account restriction reasons are displayed directly in the account-status banner.

## Chat behavior

`ChatActivityBridge` tracks `/chat` and `/chat/:id`, document visibility, focus and socket reconnects. A visible, focused Chat page sends `chat:activity` heartbeats every 20 seconds. The server expires presence after 45 seconds and treats any active Chat page on the recipient’s devices as read-on-arrival, regardless of selected conversation.

- On Chat: new messages are saved with `seen: true` / `seenAt`; no chat alert is queued. Chat navigation badges are hidden. `/api/messages/seen-all` acknowledges pre-existing incoming messages in batches of 500 and emits read receipts to their senders. The bridge drains further batches, retries on heartbeat/reconnect and handles messages that arrive during acknowledgment.
- Away from Chat, or with its tab hidden/unfocused: new messages remain unread, badges refresh from server counts, and one in-app toast is shown per message. Existing browser subscriptions continue receiving private message alerts. Returning to Chat marks the inbox read.
- Opening a conversation retains the existing visibility/read handling and history. The new acknowledgment endpoint only updates the authenticated recipient’s messages.
- Chat-only push still supports multiple devices, ownership validation, invalid endpoint cleanup, retries and stable delivery IDs. The delivery worker rechecks message read state, preferences and Chat activity. The service worker also suppresses an in-transit push when a focused Chat client is already visible.
- The Chat inbox offers an explicit “Enable message alerts” prompt for browsers without a subscription. This requests permission only after a click; there are no notification settings in Profile Settings.

## API / model changes

`/api/notifications` was removed. Browser push endpoints are now `/api/messages/push/config` (GET) and `/api/messages/push/subscriptions` (POST/DELETE). `/api/messages/seen-all` (POST) is authenticated and can mark only the caller’s received messages read. Existing conversation send/read/history and unread-count endpoints remain.

`ChatAlert` is a private message delivery queue, not a user-facing inbox. It reuses the earlier MongoDB `notifications` collection to avoid migrating or deleting existing message delivery records. Only `kind: message` records are dispatched; old general records are inaccessible and never sent. PushSubscription and PushDelivery retain their established collections. General preference fields are no longer serialized or updated. The browser service worker is `/chat-sw.js`, registered at the existing root scope so browser subscriptions survive the update.

Backend admin APIs still live under `/api/admin`: dashboard, reports, users, listings, warnings, restrictions, activity, settings, and the confirmed `/actions` mutation endpoint. Role authorization is enforced against the database. Admin assignment uses `node scripts/set-admin.js existing-verified-email` from Backend. The requested `unimarket.app.official@gmail.com` account already has admin access.

## UI changes

- Shared `common/ViewAllLink` renders identical Items and Accommodation “View All >” links, with their respective routes, spacing, hover behavior and a nonshrinking arrow.
- Shared `common/BrandLogo` uses the existing UM SVG and wordmark in the main navbar and Chat navigation. Compact tablet rails show the existing monogram rather than crop the wordmark.
- Footer Contact spans the available mobile width with readable type and natural wrapping. The navbar Contact submenu loses excessive mobile indentation and its footer stacks naturally.
- Reporting controls now live in `common/ReportDialog`; account notices live in `common/AccountStatusBanner`. Neither depends on a Notifications feature.

## Push deployment

Use a MongoDB replica set (Atlas is suitable). From Backend, `node scripts/configure-push.js` creates stable VAPID keys in ignored `.env` only when none exist. Local keys are already configured. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CLIENT_URL` on the hosted backend; never publish the private key. Set `REACT_APP_API_URL` on the frontend. Serve `/chat-sw.js` as JavaScript at the frontend origin and retain SPA route fallback. Web Push requires HTTPS or localhost and browser opt-in. Supported iPhone/iPad browsers require a Home Screen web app.

The current Socket.IO deployment uses one server. Multiple instances require a shared Socket.IO adapter for cross-instance room events and Chat presence; the durable database delivery queue already coordinates workers.

## Verification

Frontend: `CI=true npm test -- --watchAll=false --runInBand` and `CI=true npm run build`.

Backend, with an isolated `chatTest` replica set on localhost:27029:

```
CHAT_TEST_MONGO_URL=mongodb://127.0.0.1:27029 node --test --test-concurrency=1 test/chat.integration.test.js test/moderation.integration.test.js test/notification-worker.test.js
```

The suites cover chat safety, authenticated read state, admin authorization/actions, report validation, push retries/multiple devices, active-page suppression and service-worker privacy/click behavior. Transport responses are simulated; real vendor/device delivery requires an opted-in browser.

`test/preview-server.js` is an explicitly isolated browser fixture server. It uses only the fixed local `unimarket_admin_preview` database. Start it with `UNIMARKET_PREVIEW=isolated CLIENT_URL=http://localhost:3001 node test/preview-server.js` and use frontend port 3001 with API port 8001. Never deploy the preview entry point.

Browser verification covered 72 page/viewport combinations: Home, Items, Accommodation, Search, Post, Profile, Profile Settings, Chat inbox, selected Chat, How It Works, Privacy and Terms at 1440, 1100, 820, 768, 390 and 320 pixels wide. No page overflow or browser exceptions were found. Live local sends verified active Chat = seen/no toast/no badge, away = unread/toast/badge, and returning = read/badge cleared. Contact menu bounds and matching View All arrow styles were checked at every width.
