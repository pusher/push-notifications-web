/* eslint-env serviceworker */
import doRequest from './do-request';
import DeviceStateStore from './device-state-store';

self.PusherPushNotifications = {
  endpointOverride: null,
  onNotificationReceived: null,
  _messagesListeners: [],

  _messageReceived: (event) => {
    for(const listener of self.PusherPushNotifications._messagesListeners){
      listener(event)
    }
  },

  _addMessageListener: (listener) => {
    self.PusherPushNotifications._messagesListeners.push(listener)
  },

  _removeMessageListener: (listener) => {
    self.PusherPushNotifications._messagesListeners = self.PusherPushNotifications._messagesListeners.filter(l => l !== listener)
  },

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

  _getFocusedClient: () =>
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clients => clients.find(c => c.focused === true)),

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
    const showNotification = async () => {
      const title = payload.notification.title || '';
      const body = payload.notification.body || '';
      const icon = payload.notification.icon;

      const options = {
        body,
        icon,
        data: { pusherPayload: payload },
      };

      return self.registration.showNotification(title, options);
    }

    let focusedClient = await self.PusherPushNotifications._getFocusedClient()
    if(focusedClient) {
      return new Promise((resolve)=>{
        // Wait a maximum of 200ms before showing notification anyway
        let timeout = setTimeout(()=>{
          self.PusherPushNotifications._removeMessageListener(messageListener)
          resolve(showNotification())
        }, 200)

        let publishId = payload.data.pusher.publishId;
        let messageListener = (event) => {
          if(event.data.type === 'pusher-notification-filter-response' && event.data.publishId === publishId){
            clearTimeout(timeout)
            self.PusherPushNotifications._removeMessageListener(messageListener)
            if(event.data.shouldShow === true) {
              resolve(showNotification())
            } else {
              resolve()
            }
          }
        }
        self.PusherPushNotifications._addMessageListener(messageListener)
        focusedClient.postMessage({
          type: 'pusher-notification-filter-request',
          publishId,
          payload: customerPayload
        });
      })
    } else {
      return showNotification()
    }
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

self.addEventListener('message', event => {
  self.PusherPushNotifications._messageReceived(event)
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

    let goToDeepLink = async ()=>{
      if (payload.notification.deep_link) {
        return self.clients.openWindow(payload.notification.deep_link);
      }
    }

    let checkClient = (client) => {
      return new Promise(resolve => {
        let timeout = setTimeout(()=>{
          self.PusherPushNotifications._removeMessageListener(messageListener)
          resolve(false)
        }, 100)

        let publishId = payload.publishId;
        let messageListener = (event) => {
          if(event.data.type === 'pusher-click-listener-response' && event.data.publishId === publishId){
            clearTimeout(timeout)
            self.PusherPushNotifications._removeMessageListener(messageListener)
            resolve(event.data.shouldTakeFocus)
          }
        }
        self.PusherPushNotifications._addMessageListener(messageListener)
        client.postMessage({
          type: 'pusher-click-listener-request',
          publishId,
          payload
        });
      })
    }

    let checkClients = async ()=>{
      let clients = await self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

      // Check the focused client first
      clients.sort((client1,client2)=>{
        if(client1.focused === client2.focused){
          return 0
        } else if (client1.focused) {
          return -1
        } else {
          return 1
        }
      })

      for(const client of clients){
        let shouldTakeFocus = await checkClient(client)
        if (shouldTakeFocus) {
          return client.focus()
        }
      }
      return goToDeepLink()
    }

    e.waitUntil(checkClients())
    e.notification.close();
  }
});
