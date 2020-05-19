const makePushEvent = payload => ({
  waitUntil: () => {},
  data: {
    json: () => JSON.parse(payload),
  },
});

let listeners = {};
let shownNotifications = [];

beforeEach(() => {
  listeners = {};
  shownNotifications = [];

  global.addEventListener = (name, func) => {
    listeners[name] = func;
  };
  global.registration = {
    showNotification: (title, options) =>
      shownNotifications.push({ title, options }),
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
