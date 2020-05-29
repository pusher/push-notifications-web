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

    return self.registration.showNotification(title, options);
  };

  if (self.PusherPushNotifications.onNotificationReceived) {
    self.PusherPushNotifications.onNotificationReceived({
      payload: customerPayload,
      pushEvent: e,
      handleNotification,
    });
  } else {
    e.waitUntil(handleNotification(payload));
  }
});

self.addEventListener('notificationclick', e => {
  const { pusherPayload: payload } = e.notification.data;

  const isPusherNotification = payload !== undefined;
  if (isPusherNotification) {
    if (payload.notification.deep_link) {
      e.waitUntil(clients.openWindow(payload.notification.deep_link));
    }
    e.notification.close();
  }
});
