// Service worker: получает push, даже когда сайт закрыт, и показывает уведомление.
self.addEventListener("push", event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = {}; }

    const title = data.title || "Habit Tracker";
    const options = {
        body: data.body || "",
        data: { url: data.url || "/index.html" }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Клик по уведомлению открывает сайт (или фокусирует уже открытую вкладку).
self.addEventListener("notificationclick", event => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/index.html";

    event.waitUntil((async () => {
        const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const w of windows) {
            if ("focus" in w) {
                await w.focus();
                if ("navigate" in w) await w.navigate(url);
                return;
            }
        }
        await clients.openWindow(url);
    })());
});