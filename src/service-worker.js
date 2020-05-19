/* eslint-env serviceworker */
self.PusherPushNotifications = {
  onNotificationReceived: null,
};

self.addEventListener('push', e => {
  let payload;
  try {
    payload = e.data.json();
  } catch (_) {
    return; // Not a pusher notification
  }

  if (!payload.data || !payload.data.pusher) {
    return; // Not a pusher notification
  }

  const customerPayload = { ...payload };
  const customerData = {};
  Object.keys(customerPayload.data || {}).forEach(key => {
    if (key !== 'pusher') {
      customerData[key] = customerPayload.data[key];
    }
  });
  customerPayload.data = customerData;

  const handleNotification = payload => {
    const title = payload.notification.title || '';
    const body = payload.notification.body || '';
    const icon = payload.notification.icon;

    const options = {
      body,
      icon,
      data: { pusherPayload: payload },
    };

    e.waitUntil(self.registration.showNotification(title, options));
  };

  if (PusherPushNotifications.onNotificationReceived) {
    PusherPushNotifications.onNotificationReceived({
      payload: customerPayload,
      handleNotification,
    });
  } else {
    handleNotification(payload);
  }
});

self.addEventListener('notificationclick', event => {
  const { pusherPayload: payload } = event.notification.data;

  const isPusherNotification = payload !== undefined;
  if (isPusherNotification) {
    if (payload.notification.deep_link) {
      event.waitUntil(clients.openWindow(payload.notification.deep_link));
    }
    event.notification.close();
  }
});
