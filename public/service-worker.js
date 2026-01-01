self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Trading Bot Update';
  const options = {
    body: data.body || 'New message received',
    icon: '/bot-icon.png', // Fallback icon
    badge: '/badge-icon.png',
    data: data.url,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Optionally open the app
  event.waitUntil(
    clients.openWindow('/')
  );
});
