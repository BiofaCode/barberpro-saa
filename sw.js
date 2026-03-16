/* ============================================
   SalonPro — Service Worker (Push Notifications)
   ============================================ */

const CACHE_NAME = 'salonpro-v1';

// Install
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Push event — show notification
self.addEventListener('push', (event) => {
    let data = { title: 'SalonPro', body: 'Nouveau message', icon: '/saas/img/icon-192.png' };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        if (event.data) data.body = event.data.text();
    }

    const options = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'salonpro-notif',
        data: { url: data.url || '/pro' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click — open /pro or the given URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/pro';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If /pro is already open, focus it
            for (const client of windowClients) {
                if (client.url.includes('/pro') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open /pro
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
