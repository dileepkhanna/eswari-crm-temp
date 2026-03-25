// Service Worker for Push Notifications - Complete Reimplementation
// Version: 2.0

const CACHE_NAME = 'eswari-crm-v2';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2.0');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2.0');
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Push event - This is the critical part for notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let notificationData = {
    title: 'Eswari CRM',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'eswari-notification',
    requireInteraction: false,
    data: {}
  };

  // Parse the push payload
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
      
      notificationData.title = payload.title || notificationData.title;
      notificationData.body = payload.body || payload.message || notificationData.body;
      notificationData.tag = payload.tag || `notification-${Date.now()}`;
      notificationData.data = payload.data || {};
      
      // Add action buttons if needed
      if (payload.actions) {
        notificationData.actions = payload.actions;
      }
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      // Use text content as fallback
      notificationData.body = event.data.text();
    }
  }

  // CRITICAL: Always show notification for push events
  // This prevents the "site updated in background" message
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      silent: false,
      renotify: true
    }).then(() => {
      console.log('[SW] Notification displayed successfully');
      
      // Notify all open clients about the new notification
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((clients) => {
      console.log('[SW] Notifying', clients.length, 'open clients');
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_RECEIVED',
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data
        });
      });
    }).catch((error) => {
      console.error('[SW] Error showing notification:', error);
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus().then(() => {
            // Navigate to the URL if needed
            if (urlToOpen !== '/') {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                url: urlToOpen
              });
            }
          });
        }
      }
      
      // No window open, open a new one
      if (self.clients.openWindow) {
        console.log('[SW] Opening new window');
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message event - for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker script loaded');
