const makePushEvent = payload => ({
  data: {
    json: () => JSON.parse(payload),
  },
});

let listeners = {};
let sentNotifications = [];

beforeEach(() => {
  listeners = {};
  global.addEventListener = (name, func) => {
    listeners[name] = func;
  };
  global.registration = {
    showNotification: (title, options) =>
      sentNotifications.append({ title, options }),
  };

  jest.resetModules();
});

describe('SW should ignore notification when', () => {
  test.each([
    ['payload is not a json object', '£)$*£()*A)(£*$£('],
    ['payload has no data field', '{"key": "value"}'],
    ['payload has no pusher field', '{"data": {}}'],
  ])('%s', (_, payload) => {
    const sw = require('./service-worker.js');
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
    expect(sentNotifications).toHaveLength(0);

    // And the onNotificationReceived handler should NOT be called
    expect(onNotificationReceivedCalled).toBe(false);
  });
});
