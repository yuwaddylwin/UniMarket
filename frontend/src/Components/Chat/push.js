import { axiosInstance } from "../../lib/axios";
export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  window.isSecureContext;
export async function worker() {
  return navigator.serviceWorker.register("/chat-sw.js", { scope: "/" });
}
function decodeKey(value) {
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (char) => char.charCodeAt(0)
  );
}
export async function enablePush(userId) {
  if (!pushSupported())
    throw new Error(
      "This browser does not support Web Push. On iPhone or iPad, add UniMarket to your Home Screen and open it there."
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Permission was not granted. You can enable notifications in your browser settings later."
    );
  const { data } = await axiosInstance.get("/messages/push/config");
  if (!data.enabled)
    throw new Error(
      "Browser notifications are not configured on the server yet."
    );
  await worker();
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(data.publicKey),
    }));
  await axiosInstance.post(
    "/messages/push/subscriptions",
    subscription.toJSON()
  );
  registration.active?.postMessage({ type: "USER", userId });
  return subscription;
}
export async function disableDevicePush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  registration?.active?.postMessage({ type: "USER", userId: null });
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await axiosInstance.delete("/messages/push/subscriptions", {
      data: { endpoint: subscription.endpoint },
    });
  }
}
export async function syncPush(userId, enabled) {
  if (!pushSupported()) return;
  const registration = await worker();
  (
    registration.active ||
    registration.waiting ||
    registration.installing
  )?.postMessage({ type: "USER", userId });
  if (!enabled || Notification.permission !== "granted") return;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription)
    await axiosInstance.post(
      "/messages/push/subscriptions",
      subscription.toJSON()
    );
}
