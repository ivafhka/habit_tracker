import { API_URL } from "./config.js";
import { getToken } from "./api.js";

const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const reg = await getRegistration();
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error("Этот браузер не поддерживает push-уведомления");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Разрешение на уведомления не выдано");
  }

  const keyRes = await fetch(`${API_URL}/api/push/public-key`);
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error("На сервере не настроены VAPID-ключи");
  }

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch(`${API_URL}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(sub),
  });

  if (!res.ok) {
    throw new Error("Не удалось сохранить подписку на сервере");
  }
}

export async function disablePush() {
  const sub = await getCurrentPushSubscription();
  if (!sub) return;

  await fetch(`${API_URL}/api/push/unsubscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
