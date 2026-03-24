// Django Web Push Service Worker — no Firebase needed

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Eswari CRM', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Eswari CRM';
  const body = data.body || 'You have a new notification';
  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.data?.notification_id || `eswari-crm-${Date.now()}`,
    data: data.data || {},
    requireInteraction: false,
    // Force notification to always show with proper content
    silent: false,
    renotify: true,
    vibrate: [200, 100, 200],
  };

  // Show the OS notification - this MUST happen for background notifications
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Notify all open app windows so they can refresh the notification list
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        list.forEach((client) => {
          client.postMessage({ 
            type: 'PUSH_RECEIVED', 
            title, 
            body,
            data: data.data || {}
          });
        });
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
