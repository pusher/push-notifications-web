self.addEventListener('push', function(e) {
  const payload = e.data.json();

  const title = payload.notification.title || '';
  const body = payload.notification.body || '';
  const icon = payload.notification.icon;
  const data = payload.data || {};

  const options = {
    title,
    body,
    icon,
    data,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});
