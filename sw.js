// Service Worker for Droplet PWA
const CACHE_NAME = 'droplet-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/droplet-icon-192.png',
  './icons/droplet-icon-512.png'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Push notification event (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Time to drink water! 💧',
    icon: 'icons/droplet-icon-192.png',
    badge: 'icons/droplet-icon-192.png',
    tag: 'droplet-reminder',
    requireInteraction: false,
    silent: true // Don't play default sound on iOS
  };

  event.waitUntil(
    self.registration.showNotification('💕 Droplet Reminder!', options)
  );
});

// Notification click event - IMPROVED for iOS
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open one
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
