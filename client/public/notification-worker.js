// Service Worker for background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PLAY_SOUND') {
    // Show notification which will alert the user even when tab is in background
    self.registration.showNotification('Trading Signal', {
      body: event.data.message || 'New trading signal detected!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: 'trading-signal',
      requireInteraction: false,
      silent: false
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
