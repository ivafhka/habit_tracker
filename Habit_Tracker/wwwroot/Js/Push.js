// Подписка на Web Push. Требует HTTPS (на localhost работает и по http).

function isPushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function getCurrentPushSubscription() {
    if (!isPushSupported()) return null;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
}

async function enablePush() {
    if (!isPushSupported()) {
        throw new Error("Этот браузер не поддерживает push-уведомления");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        throw new Error("Разрешение на уведомления не выдано");
    }

    const token = localStorage.getItem("token");

    const keyRes = await fetch(`${API_URL}/api/push/public-key`);
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
        throw new Error("На сервере не настроены VAPID-ключи");
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
    }

    const res = await fetch(`${API_URL}/api/push/subscribe`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(sub)
    });

    if (!res.ok) {
        throw new Error("Не удалось сохранить подписку на сервере");
    }
}

async function disablePush() {
    const sub = await getCurrentPushSubscription();
    if (!sub) return;

    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: sub.endpoint })
    });
    await sub.unsubscribe();
}