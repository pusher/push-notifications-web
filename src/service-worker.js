/* eslint-env serviceworker */

self.addEventListener('push', function(e) {
  const payload = e.data.json();

  const title = payload.notification.title || '';
  const body = payload.notification.body || '';
  const icon = payload.notification.icon;
  const data = payload.data || {};

  if (payload.notification.deep_link) {
    // Copying the deep_link into the data payload so that it can
    // be accessed in the notificationclick handler.
    data.pusher.deep_link = payload.notification.deep_link;
  }

  const options = {
    title,
    body,
    icon,
    data,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  const deep_link = event.notification.data.pusher.deep_link;
  if (deep_link) {
    event.waitUntil(clients.openWindow(deep_link));
  }
  event.notification.close();
});
