/* Atlas Secure dashboard service worker — handles Web Push + notification taps. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Network pass-through (no offline caching) — present so the app is installable.
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Atlas Secure', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '🆘 Новый тикет';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.ticketId ? `ticket-${data.ticketId}` : 'atlas',
    renotify: true,
    vibrate: [80, 40, 80],
    data: { ticketId: data.ticketId || null, url: '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ticketId = event.notification.data && event.notification.data.ticketId;
  const target = ticketId ? `/?ticket=${ticketId}` : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-ticket', ticketId });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
