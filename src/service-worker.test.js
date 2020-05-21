let listeners = {};
let shownNotifications = [];
let openedWindows = [];

beforeEach(() => {
  listeners = {};
  shownNotifications = [];
  openedWindows = [];

  global.addEventListener = (name, func) => {
    listeners[name] = func;
  };
  global.registration = {
    showNotification: (title, options) =>
      shownNotifications.push({ title, options }),
  };
  global.clients = {
    openWindow: url => openedWindows.push(url),
  };

  jest.resetModules();
});

describe('SW should ignore notification when', () => {
  test.each([
    ['payload is not a json object', '£)$*£()*A)(£*$£('],
    ['payload has no data field', '{"key": "value"}'],
    ['payload has no pusher field', '{"data": {}}'],
  ])('%s', (_, payload) => {
    require('./service-worker.js');
    const PusherPushNotifications = global.PusherPushNotifications;

    // Given an onNotificationReceived had been set
    let onNotificationReceivedCalled = false;
    PusherPushNotifications.onNotificationReceived = () => {
      onNotificationReceivedCalled = true;
    };

    // When the push listener is called
    const pushListener = listeners['push'];
    if (!pushListener) {
      throw new Error('No push listener has been set');
    }
    pushListener(makePushEvent(payload));

    // Then a notification should NOT be shown
    expect(shownNotifications).toHaveLength(0);

    // And the onNotificationReceived handler should NOT be called
    expect(onNotificationReceivedCalled).toBe(false);
  });
});

test('SW should show notification when it comes from Pusher', () => {
  require('./service-worker.js');

  // Given a push event that comes from Pusher
  const pushEvent = makePushEvent(`
      {
        "notification": {
          "title": "Hi!",
          "body": "This is a notification!",
          "icon": "my-icon.png"
        },
        "data": {
          "pusher": {
            "publishId": "some-publish-id"
          }
        }
      }
    `);

  // When the push listener is called
  const pushListener = listeners['push'];
  if (!pushListener) {
    throw new Error('No push listener has been set');
  }
  pushListener(pushEvent);

  // Then a notification should be shown
  expect(shownNotifications).toHaveLength(1);
  expect(shownNotifications[0]).toEqual({
    title: 'Hi!',
    options: {
      icon: 'my-icon.png',
      body: 'This is a notification!',
      data: {
        pusherPayload: {
          notification: {
            title: 'Hi!',
            body: 'This is a notification!',
            icon: 'my-icon.png',
          },
          data: {
            pusher: {
              publishId: 'some-publish-id',
            },
          },
        },
      },
    },
  });
});

test('SW should NOT show notification if onNotificationReceived handler is set', () => {
  require('./service-worker.js');
  const PusherPushNotifications = global.PusherPushNotifications;

  // Given a push event that comes from Pusher
  const pushEvent = makePushEvent(`
      {
        "notification": {
          "title": "Hi!",
          "body": "This is a notification!",
          "icon": "my-icon.png"
        },
        "data": {
          "pusher": {
            "publishId": "some-publish-id"
          }
        }
      }
    `);

  // And an onNotificationReceived had been set
  let onNotificationReceivedCalled = false;
  PusherPushNotifications.onNotificationReceived = () => {
    onNotificationReceivedCalled = true;
  };

  // When the push listener is called
  const pushListener = listeners['push'];
  if (!pushListener) {
    throw new Error('No push listener has been set');
  }
  pushListener(pushEvent);

  // Then a notification should NOT be shown
  expect(shownNotifications).toHaveLength(0);

  // And the onNotificationReceived handler should be called
  expect(onNotificationReceivedCalled).toBe(true);
});

test('SW should pass correct params to onNotificationReceived', () => {
  require('./service-worker.js');
  const PusherPushNotifications = global.PusherPushNotifications;

  // Given a push event that comes from Pusher
  const pushEvent = makePushEvent(`
      {
        "notification": {
          "title": "Hi!",
          "body": "This is a notification!",
          "icon": "my-icon.png"
        },
        "data": {
          "pusher": {
            "publishId": "some-publish-id"
          }
        }
      }
    `);

  // And an onNotificationReceived had been set
  let onNotificationReceivedParams;
  PusherPushNotifications.onNotificationReceived = params => {
    onNotificationReceivedParams = params;
  };

  // When the push listener is called
  const pushListener = listeners['push'];
  if (!pushListener) {
    throw new Error('No push listener has been set');
  }
  pushListener(pushEvent);

  // Then onNotificationReceivedCalled should get the expected params
  expect(onNotificationReceivedParams.payload).toEqual({
    notification: {
      title: 'Hi!',
      body: 'This is a notification!',
      icon: 'my-icon.png',
    },
    data: {}, // Pusher namespace should be stripped
  });
  expect(onNotificationReceivedParams.pushEvent).toBe(pushEvent);
  expect(typeof onNotificationReceivedParams.handleNotification).toEqual(
    'function'
  );
});

test('SW should show correct notification if handleNotification is called', () => {
  require('./service-worker.js');
  const PusherPushNotifications = global.PusherPushNotifications;

  // Given a push event that comes from Pusher
  const pushEvent = makePushEvent(`
      {
        "notification": {
          "title": "Hi!",
          "body": "This is a notification!",
          "icon": "my-icon.png"
        },
        "data": {
          "pusher": {
            "publishId": "some-publish-id"
          }
        }
      }
    `);

  // And an onNotificationReceived had been set
  PusherPushNotifications.onNotificationReceived = ({
    payload,
    handleNotification,
  }) => {
    payload.notification.body = 'Body has been changed';
    handleNotification(payload);
  };

  // When the push listener is called
  const pushListener = listeners['push'];
  if (!pushListener) {
    throw new Error('No push listener has been set');
  }
  pushListener(pushEvent);

  // Then a notification should be shown
  expect(shownNotifications).toHaveLength(1);

  // And should have the correct payload
  const notification = shownNotifications[0];
  expect(notification.options.body).toEqual('Body has been changed');
});

test('SW should open deep link in click handler if one is provided', () => {
  require('./service-worker.js');

  // Given a notification click event with a deep link
  const clickEvent = makeClickEvent({
    data: {
      pusherPayload: {
        notification: {
          title: 'Hi!',
          body: 'This is a notification!',
          deep_link: 'https://pusher.com',
        },
        data: {
          pusher: {
            publishId: 'some-publish-id',
          },
        },
      },
    },
  });

  // When the notificationclick listener is called
  const clickListener = listeners['notificationclick'];
  if (!clickListener) {
    throw new Error('No click listener has been set');
  }
  clickListener(clickEvent);

  // Then the deep link should be opened in a new tab
  expect(openedWindows).toHaveLength(1);
  expect(openedWindows[0]).toEqual('https://pusher.com');

  // And the notification should be closed
  expect(clickEvent._isOpen()).toEqual(false);
});

test('SW should do nothing on click if notification is not from Pusher', () => {
  require('./service-worker.js');

  // Given a notification click event with a deep link
  const clickEvent = makeClickEvent({
    data: {},
  });

  // When the notificationclick listener is called
  const clickListener = listeners['notificationclick'];
  if (!clickListener) {
    throw new Error('No click listener has been set');
  }
  clickListener(clickEvent);

  // Then no new tabs should be opened
  expect(openedWindows).toHaveLength(0);

  // And the notification should NOT be closed
  expect(clickEvent._isOpen()).toEqual(true);
});

const makePushEvent = payload => ({
  waitUntil: () => {},
  data: {
    json: () => JSON.parse(payload),
  },
});

const makeClickEvent = ({ data }) => {
  let isOpen = true;

  return {
    _isOpen: () => isOpen,

    waitUntil: () => {},
    notification: {
      data,
      close: () => {
        isOpen = false;
      },
    },
  };
};
