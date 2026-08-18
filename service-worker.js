
const CACHE_NAME = "onecentrum-admin-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {
            title: "New Visitor Request",
            body: event.data ? event.data.text() : "A new visitor request has arrived."
        };
    }

    const title = data.title || "New Visitor Request";
    const options = {
        body: data.body || "A new visitor request has arrived.",
        icon: data.icon || "assets/company-logo.png",
        badge: data.badge || "assets/company-logo.png",
        tag: data.tag || "new-visitor-request",
        renotify: true,
        requireInteraction: false,
        data: {
            url: data.url || "./admin.html"
        },
        vibrate: [180, 90, 180]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl = new URL(
        event.notification.data?.url || "./admin.html",
        self.location.origin
    ).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if ("focus" in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
