/* eslint-env serviceworker */
import doRequest from './do-request';
import DeviceStateStore from './device-state-store';
import urljs from 'urijs'

self.PusherPushNotifications = {
  endpointOverride: null,
  onNotificationReceived: null,

  _endpoint: instanceId =>
    self.PusherPushNotifications.endpointOverride
      ? self.PusherPushNotifications.endpointOverride
      : `https://${instanceId}.pushnotifications.pusher.com`,

  _getVisibleClient: () =>
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clients => clients.find(c => c.visibilityState === 'visible')),

  _hasVisibleClient: () =>
    self.PusherPushNotifications._getVisibleClient().then(
      client => client !== undefined
    ),

  _getFocusedClients: () =>
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clients => clients.filter(c => c.focused === true)),

  _hasFocusedClient: () =>
    self.PusherPushNotifications._getFocusedClients().then(
      clients => clients.length > 0
    ),

  reportEvent: async ({ eventType, pusherMetadata }) => {
    const {
      instanceId,
      publishId,
      hasDisplayableContent,
      hasData,
    } = pusherMetadata;
    if (!instanceId || !publishId) {
      // Can't report this notification, fail silently.
      return;
    }

    const deviceStateStore = new DeviceStateStore(instanceId);
    await deviceStateStore.connect();

    const deviceId = await deviceStateStore.getDeviceId();
    const userId = (await deviceStateStore.getUserId()) || null;

    const appInBackground = !(await self.PusherPushNotifications._hasVisibleClient());

    const path = `${self.PusherPushNotifications._endpoint(
      instanceId
    )}/reporting_api/v2/instances/${instanceId}/events`;

    const options = {
      method: 'POST',
      path,
      body: {
        publishId,
        event: eventType,
        deviceId,
        userId,
        timestampSecs: Date.now() / 1000,
        appInBackground,
        hasDisplayableContent,
        hasData,
      },
    };

    try {
      await doRequest(options);
    } catch (_) {
      // Reporting is best effort, so we do nothing.
    }
  },
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

  // Report analytics event, best effort
  self.PusherPushNotifications.reportEvent({
    eventType: 'delivery',
    pusherMetadata: payload.data.pusher,
  });

  const customerPayload = { ...payload };
  const customerData = {};
  Object.keys(customerPayload.data || {}).forEach(key => {
    if (key !== 'pusher') {
      customerData[key] = customerPayload.data[key];
    }
  });
  customerPayload.data = customerData;

  const handleNotification = async payload => {
    let hidePayload = payload.notification.hide_notification_if_page_has_focus
    if (hidePayload) {
      let mode = hidePayload.mode
      if (mode === "deep_link" || mode === "url") {
        let rawUrl;
        if (mode === "deep_link") {
          rawUrl = payload.notification.deep_link
        } else {
          rawUrl = hidePayload.url
        }

        let url = urljs(rawUrl)
        if (hidePayload.ignore_all_query_parameters) {
          url.query("")
        }
        if (hidePayload.ignore_fragment) {
          url.fragment("")
        }
        if (hidePayload.ignore_protocol) {
          url.protocol("")
        }

        if (url.is("relative")) {
          url = url.absoluteTo(self.location)
        }

        let focusedClients = await self.PusherPushNotifications._getFocusedClients()
        for (const focusedClient of focusedClients) {
          let clientURL = urljs(focusedClient.url)
          if (hidePayload.ignore_all_query_parameters) {
            clientURL.query('')
          }
          if (hidePayload.ignore_fragment) {
            clientURL.fragment('')
          }
          if (hidePayload.ignore_protocol) {
            url.protocol("")
          }

          if (url.equals(clientURL)) {
            return
          }
        }
      } else if (await self.PusherPushNotifications._hasFocusedClient()) {
        return
      }
    }

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
    // Report analytics event, best effort
    self.PusherPushNotifications.reportEvent({
      eventType: 'open',
      pusherMetadata: payload.data.pusher,
    });

    if (payload.notification.deep_link) {
      e.waitUntil(clients.openWindow(payload.notification.deep_link));
    }
    e.notification.close();
  }
});
