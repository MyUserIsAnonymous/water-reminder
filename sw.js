// Service Worker for Droplet PWA - TEST VERSION
const CACHE_NAME = 'droplet-test-v3'; // ⬅️ CHANGED VERSION NUMBER
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/droplet-icon-192.png',
  './icons/droplet-icon-512.png'
];

// TEST MODE SETTINGS - ADD THESE
const TEST_MODE = true; // Set to true for testing
const LOG_EVENTS = true; // Log all service worker events

// Install event
self.addEventListener('install', event => {
  if (LOG_EVENTS) console.log('🛠️ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        if (LOG_EVENTS) console.log('📦 Caching files:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        if (LOG_EVENTS) console.log('✅ Installation complete');
        return self.skipWaiting(); // ⬅️ IMPORTANT: Activate immediately
      })
      .catch(error => {
        console.error('❌ Installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  if (LOG_EVENTS) console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      if (LOG_EVENTS) console.log('📁 Found caches:', cacheNames);
      
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            if (LOG_EVENTS) console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      if (LOG_EVENTS) console.log('✅ Activation complete');
      return self.clients.claim(); // ⬅️ IMPORTANT: Take control immediately
    })
  );
});

// Fetch event - ENHANCED for testing
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // For testing: Always fetch fresh HTML
  if (event.request.url.includes('index.html') && TEST_MODE) {
    if (LOG_EVENTS) console.log('🔄 TEST: Fetching fresh HTML');
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          if (LOG_EVENTS) console.log('📦 Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        if (LOG_EVENTS) console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Cache successful responses (except large files)
            if (networkResponse.ok && 
                !event.request.url.includes('.mp4') &&
                !event.request.url.includes('.mp3') &&
                !event.request.url.includes('.avi')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  if (LOG_EVENTS) console.log('💾 Cached new resource:', event.request.url);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Fetch failed:', error);
            // Return offline page if available
            return caches.match('./');
          });
      })
  );
});

// Push notification event - TEST VERSION
self.addEventListener('push', event => {
  if (LOG_EVENTS) console.log('📨 Push event received:', event);
  
  let notificationData = {
    title: '💧 Droplet Reminder',
    body: 'Time to drink water! 💦',
    icon: 'icons/droplet-icon-192.png',
    badge: 'icons/droplet-icon-192.png',
    tag: 'droplet-reminder',
    requireInteraction: false,
    silent: true, // Don't play default sound on iOS
    data: {
      url: './',
      timestamp: new Date().toISOString(),
      testMode: TEST_MODE
    }
  };
  
  // Try to parse push data
  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    }
  } catch (e) {
    // Use default if parsing fails
    if (LOG_EVENTS) console.log('📄 Using default push data');
  }
  
  if (TEST_MODE) {
    notificationData.body = '🧪 TEST: ' + notificationData.body;
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        if (LOG_EVENTS) console.log('✅ Notification shown:', notificationData);
      })
      .catch(error => {
        console.error('❌ Notification failed:', error);
      })
  );
});

// Notification click event - ENHANCED for testing
self.addEventListener('notificationclick', event => {
  if (LOG_EVENTS) console.log('👆 Notification clicked:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || './';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope)) {
          if (LOG_EVENTS) console.log('🎯 Focusing existing window');
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        if (LOG_EVENTS) console.log('🪟 Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
    .catch(error => {
      console.error('❌ Notification click failed:', error);
    })
  );
});

// NEW: Background sync for testing
self.addEventListener('sync', event => {
  if (LOG_EVENTS) console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'droplet-reminder-sync') {
    event.waitUntil(
      // This could sync reminder data with server
      // For now, just log it
      Promise.resolve().then(() => {
        if (LOG_EVENTS) console.log('✅ Background sync completed');
      })
    );
  }
});

// NEW: Periodic sync for testing (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (LOG_EVENTS) console.log('🔄 Periodic sync:', event.tag);
    
    if (event.tag === 'droplet-daily-sync') {
      event.waitUntil(syncReminders());
    }
  });
}

// Helper function for sync
function syncReminders() {
  return Promise.resolve().then(() => {
    if (LOG_EVENTS) console.log('📊 Syncing reminder data...');
    // In a real app, this would sync with a backend
    return Promise.resolve();
  });
}

// NEW: Message handler for communication with app
self.addEventListener('message', event => {
  if (LOG_EVENTS) console.log('📨 Message from client:', event.data);
  
  switch (event.data.type) {
    case 'TEST_NOTIFICATION':
      // Trigger a test notification from app
      self.registration.showNotification('🧪 Test Notification', {
        body: 'This is a test from the app!',
        icon: 'icons/droplet-icon-192.png',
        tag: 'test-notification'
      });
      break;
      
    case 'GET_CACHE_INFO':
      // Send cache info back to app
      caches.keys().then(cacheNames => {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          caches: cacheNames,
          currentCache: CACHE_NAME,
          testMode: TEST_MODE
        });
      });
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys().then(cacheNames => {
        Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
          .then(() => {
            event.ports[0].postMessage({
              type: 'CACHE_CLEARED',
              success: true
            });
          });
      });
      break;
  }
});

// NEW: Service worker version check
if (TEST_MODE) {
  console.log('🧪 Service Worker Test Mode ACTIVE');
  console.log('📋 Cache Name:', CACHE_NAME);
  console.log('👤 Clients:', self.clients ? 'Available' : 'Not available');
}
