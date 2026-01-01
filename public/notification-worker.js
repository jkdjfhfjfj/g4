self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Trading Bot Update';
  const options = {
    body: data.body || 'New message received',
    icon: '/bot-icon.png',
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
  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PLAY_SOUND') {
    self.registration.showNotification('Trading Bot', {
      body: event.data.message,
      icon: '/bot-icon.png',
      vibrate: [100, 50, 100],
    });
  }
});
