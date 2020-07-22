import * as PusherPushNotifications from './push-notifications';
import { makeDeviceStateStore } from '../test-utils/fake-device-state-store';

const DUMMY_PUSH_SUBSCRIPTION = { foo: 'bar' };
const ENCODED_DUMMY_PUSH_SUBSCRIPTION = 'eyJmb28iOiJiYXIifQ==';

describe('Constructor', () => {
  afterEach(() => {
    jest.resetModules();
    tearDownGlobals();
  });

  test('will throw if there is no config object given', () => {
    return expect(() => new PusherPushNotifications.Client()).toThrow(
      'Config object required'
    );
  });

  test('will throw if there is no instance ID specified', () => {
    return expect(() => new PusherPushNotifications.Client({})).toThrow(
      'Instance ID is required'
    );
  });

  test('will throw if instance ID is not a string', () => {
    const instanceId = null;
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow('Instance ID must be a string');
  });

  test('will throw if the instance id is the empty string', () => {
    const instanceId = '';
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow('Instance ID cannot be empty');
  });

  test('will throw if indexedDB is not available', () => {
    setUpGlobals({ indexedDBSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow('IndexedDB not supported');
  });

  test('will throw if the SDK is loaded from a context that is not secure', () => {
    setUpGlobals({ isSecureContext: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow(
      'Pusher Beams relies on Service Workers, which only work in secure contexts'
    );
  });

  test('will throw if ServiceWorkerRegistration not supported', () => {
    setUpGlobals({ serviceWorkerSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow('Service Workers not supported');
  });

  test('will throw if Web Push not supported', () => {
    setUpGlobals({ webPushSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(
      () => new PusherPushNotifications.Client({ instanceId })
    ).toThrow('Web Push not supported');
  });

  test('will return properly configured instance otherwise', () => {
    const PusherPushNotifications = require('./push-notifications');
    const devicestatestore = require('./device-state-store');

    setUpGlobals({});

    devicestatestore.default = makeDeviceStateStore({
      deviceId: 'web-1db66b8a-f51f-49de-b225-72591535c855',
      token: ENCODED_DUMMY_PUSH_SUBSCRIPTION,
      userId: 'alice',
    });

    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';

    const beamsClient = new PusherPushNotifications.Client({ instanceId });
    return Promise.all([
      beamsClient.getDeviceId(),
      beamsClient.getToken(),
      beamsClient.getUserId(),
    ]).then(([deviceId, token, userId]) => {
      expect(deviceId).toEqual('web-1db66b8a-f51f-49de-b225-72591535c855');
      expect(token).toEqual(ENCODED_DUMMY_PUSH_SUBSCRIPTION);
      expect(userId).toEqual('alice');
    });
  });
});

describe('interest methods', () => {
  let PusherPushNotifications = require('./push-notifications');
  let devicestatestore = require('./device-state-store');
  let dorequest = require('./do-request');

  beforeEach(() => {
    devicestatestore.default = makeDeviceStateStore({
      deviceId: 'web-1db66b8a-f51f-49de-b225-72591535c855',
      token: ENCODED_DUMMY_PUSH_SUBSCRIPTION,
      userId: 'alice',
    });
    setUpGlobals({});
  });

  afterEach(() => {
    jest.resetModules();
    PusherPushNotifications = require('./push-notifications');
    devicestatestore = require('./device-state-store');
    dorequest = require('./do-request');
  });

  describe('.addDeviceInterest', () => {
    test('should make correct request given valid arguments', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'donuts';

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      const beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.addDeviceInterest(interest).then(() => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0]).toEqual({
          method: 'POST',
          path: [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests/donuts',
          ].join(''),
        });
      });
    });

    test('should fail if interest name is not passed', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).addDeviceInterest()
      ).rejects.toThrow('Interest name is required');
    });

    test('should fail if a interest name is not a string', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = false;
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).addDeviceInterest(interest)
      ).rejects.toThrow('Interest false is not a string');
    });

    test('should fail if a interest name is too long', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      let interest = '';
      for (let i = 0; i < 165; i++) {
        interest += 'A';
      }
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).addDeviceInterest(interest)
      ).rejects.toThrow('Interest is longer than the maximum of 164 chars');
    });

    test('should fail if interest name contains invalid characters', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'bad|interest';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).addDeviceInterest(interest)
      ).rejects.toThrow('contains a forbidden character');
    });

    test('should fail if SDK is not started', () => {
      // Emulate a fresh SDK, where start has not been called
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });

      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'some-interest';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).addDeviceInterest(interest)
      ).rejects.toThrow('SDK not registered with Beams. Did you call .start?');
    });
  });

  describe('.removeDeviceInterest', () => {
    test('should make correct DELETE request', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'donuts';

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      const beamsClient = new PusherPushNotifications.Client({ instanceId });
      return beamsClient.removeDeviceInterest(interest).then(() => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0]).toEqual({
          method: 'DELETE',
          path: [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests/donuts',
          ].join(''),
        });
      });
    });

    test('should fail if interest name is not passed', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).removeDeviceInterest()
      ).rejects.toThrow('Interest name is required');
    });

    test('should fail if a interest name is not a string', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = false;
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).removeDeviceInterest(interest)
      ).rejects.toThrow('Interest false is not a string');
    });

    test('should fail if a interest name is too long', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      let interest = '';
      for (let i = 0; i < 165; i++) {
        interest += 'A';
      }
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).removeDeviceInterest(interest)
      ).rejects.toThrow('Interest is longer than the maximum of 164 chars');
    });

    test('should fail if interest name contains invalid characters', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'bad|interest';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).removeDeviceInterest(interest)
      ).rejects.toThrow('contains a forbidden character');
    });

    test('should fail if SDK is not started', () => {
      // Emulate a fresh SDK, where start has not been called
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });

      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'some-interest';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).removeDeviceInterest(interest)
      ).rejects.toThrow('SDK not registered with Beams. Did you call .start?');
    });
  });

  describe('.getDeviceInterests', () => {
    test('should make correct request and return the interests', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(
        Promise.resolve({
          interests: ['donuts'],
          responseMetadata: {},
        })
      );

      dorequest.default = mockDoRequest;

      const beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.getDeviceInterests().then(interests => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0]).toEqual({
          method: 'GET',
          path: [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests',
          ].join(''),
        });
        expect(interests).toEqual(['donuts']);
      });
    });

    test('should fail if SDK is not started', () => {
      // Emulate a fresh SDK, where start has not been called
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });

      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).getDeviceInterests()
      ).rejects.toThrow('SDK not registered with Beams. Did you call .start?');
    });
  });

  describe('.setDeviceInterests', () => {
    test('should make correct PUT request', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = ['apples', 'bananas', 'cabbages', 'donuts'];

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      const beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.setDeviceInterests(interests).then(() => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0].method).toEqual('PUT');
        expect(mockDoRequest.mock.calls[0][0].path).toEqual(
          [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests',
          ].join('')
        );
        expect(mockDoRequest.mock.calls[0][0].body.interests.sort()).toEqual(
          [...interests].sort()
        );
      });
    });

    test('should make correct PUT request with duplicate interests', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = ['apples', 'apples', 'apples', 'bananas'];

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      const expectedInterests = ['apples', 'bananas'];

      const beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.setDeviceInterests(interests).then(() => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0].method).toEqual('PUT');
        expect(mockDoRequest.mock.calls[0][0].path).toEqual(
          [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests',
          ].join('')
        );
        expect(mockDoRequest.mock.calls[0][0].body.interests.sort()).toEqual(
          expectedInterests.sort()
        );
      });
    });

    test('should fail if interest array is not passed', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests()
      ).rejects.toThrow('interests argument is required');
    });

    test('should fail if interest arg is not an array', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = false;
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests(interests)
      ).rejects.toThrow('interests argument must be an array');
    });

    test('should fail if too many interests are passed', () => {
      const maxInterests = 5000;
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = [];
      for (let i = 0; i < maxInterests + 1; i++) {
        interests.push('' + i);
      }

      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests(interests)
      ).rejects.toThrow(
        `Number of interests (${maxInterests +
          1}) exceeds maximum of ${maxInterests}`
      );
    });

    test('should fail if a given interest is not a string', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = ['good-interest', false];

      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests(interests)
      ).rejects.toThrow('Interest false is not a string');
    });

    test('should fail if a given interest is too long', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = ['right-length', ''];
      for (let i = 0; i < 165; i++) {
        interests[1] += 'A';
      }

      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests(interests)
      ).rejects.toThrow('longer than the maximum of 164 chars');
    });

    test('should fail if a given interest contains a forbidden character', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interests = ['good-interest', 'bad|interest'];

      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests(interests)
      ).rejects.toThrow(
        'interest "bad|interest" contains a forbidden character'
      );
    });

    test('should fail if SDK is not started', () => {
      // Emulate a fresh SDK, where start has not been called
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });

      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).setDeviceInterests([])
      ).rejects.toThrow('SDK not registered with Beams. Did you call .start?');
    });
  });

  describe('.clearDeviceInterests', () => {
    test('should make correct PUT request', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      const beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.clearDeviceInterests().then(() => {
        expect(mockDoRequest.mock.calls.length).toBe(1);
        expect(mockDoRequest.mock.calls[0].length).toBe(1);
        expect(mockDoRequest.mock.calls[0][0]).toEqual({
          method: 'PUT',
          path: [
            'https://df3c1965-e870-4bd6-8d75-fea56b26335f.pushnotifications.pusher.com',
            '/device_api/v1/instances/df3c1965-e870-4bd6-8d75-fea56b26335f',
            '/devices/web/web-1db66b8a-f51f-49de-b225-72591535c855',
            '/interests',
          ].join(''),
          body: { interests: [] },
        });
      });
    });

    test('should fail if SDK is not started', () => {
      // Emulate a fresh SDK, where start has not been called
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });

      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      return expect(
        new PusherPushNotifications.Client({
          instanceId,
        }).clearDeviceInterests()
      ).rejects.toThrow('SDK not registered with Beams. Did you call .start?');
    });
  });
});

describe('.getRegistrationState', () => {
  const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';

  describe('if SDK is started', () => {
    let devicestatestore = require('./device-state-store');
    beforeEach(() => {
      devicestatestore.default = makeDeviceStateStore({
        deviceId: 'web-1db66b8a-f51f-49de-b225-72591535c855',
        token: ENCODED_DUMMY_PUSH_SUBSCRIPTION,
        userId: null,
      });
    });

    afterEach(() => {
      jest.resetModules();
      devicestatestore = require('./device-state-store');
    });

    test('should return PERMISSION_GRANTED_REGISTERED_WITH_BEAMS if browser permission is granted', () => {
      setUpGlobals({ notificationPermission: 'granted' });

      let beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.getRegistrationState().then(state => {
        expect(state).toEqual(
          PusherPushNotifications.RegistrationState
            .PERMISSION_GRANTED_REGISTERED_WITH_BEAMS
        );
      });
    });
  });

  describe('if SDK is not started', () => {
    let devicestatestore = require('./device-state-store');
    beforeEach(() => {
      devicestatestore.default = makeDeviceStateStore({
        deviceId: null,
        token: null,
        userId: null,
      });
    });

    afterEach(() => {
      jest.resetModules();
      devicestatestore = require('./device-state-store');
      tearDownGlobals();
    });

    test('should return PERMISSION_DENIED if browser permission is denied', () => {
      setUpGlobals({ notificationPermission: 'denied' });

      let beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.getRegistrationState().then(state => {
        expect(state).toEqual(
          PusherPushNotifications.RegistrationState.PERMISSION_DENIED
        );
      });
    });

    test('should return PERMISSION_PROMPT_REQUIRED if browser permission is default', () => {
      setUpGlobals({ notificationPermission: 'default' });

      let beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.getRegistrationState().then(state => {
        expect(state).toEqual(
          PusherPushNotifications.RegistrationState.PERMISSION_PROMPT_REQUIRED
        );
      });
    });

    test('should return PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS if browser permission is granted', () => {
      setUpGlobals({ notificationPermission: 'granted' });

      let beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
      return beamsClient.getRegistrationState().then(state => {
        expect(state).toEqual(
          PusherPushNotifications.RegistrationState
            .PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS
        );
      });
    });
  });
});

describe('SDK state', () => {
  afterEach(() => {
    jest.resetModules();
    tearDownGlobals();
  });

  test('should be reset if subscription changes', () => {
    const PusherPushNotifications = require('./push-notifications');
    const devicestatestore = require('./device-state-store');

    let subscription = DUMMY_PUSH_SUBSCRIPTION;
    setUpGlobals({
      getSWSubscription: () => {
        return Promise.resolve(subscription);
      },
    });

    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    let deviceId = 'web-1db66b8a-f51f-49de-b225-72591535c855';
    let newSubscription = { another: 'subscription' };
    expect(newSubscription).not.toEqual(DUMMY_PUSH_SUBSCRIPTION);

    devicestatestore.default = makeDeviceStateStore({
      deviceId,
      token: ENCODED_DUMMY_PUSH_SUBSCRIPTION,
      userId: 'alice',
    });

    let beamsClient = new PusherPushNotifications.Client({
      instanceId,
    });

    return beamsClient
      .getDeviceId()
      .then(returnedDeviceId => {
        // Device ID should have been set
        return expect(returnedDeviceId).toEqual(deviceId);
      })
      .then(() => {
        // Change subscription
        subscription = newSubscription;
      })
      .then(() => beamsClient.getDeviceId())
      .then(deviceId => {
        // Device ID should have been cleared
        return expect(deviceId).toBeNull();
      });
  });
});

const setUpGlobals = ({
  indexedDBSupport = true,
  serviceWorkerSupport = true,
  webPushSupport = true,
  isSecureContext = true,
  notificationPermission = 'default',
  getSWSubscription = () => Promise.resolve(DUMMY_PUSH_SUBSCRIPTION),
}) => {
  if (indexedDBSupport) {
    global.window.indexedDB = {};
  }
  if (serviceWorkerSupport) {
    global.navigator.serviceWorker = {};
    global.navigator.serviceWorker.register = () => {};
    global.navigator.serviceWorker.ready = Promise.resolve({
      pushManager: {
        getSubscription: getSWSubscription,
      },
    });
  }
  if (webPushSupport) {
    global.window.PushManager = {};
  }
  global.window.isSecureContext = isSecureContext;

  global.Notification = {};
  global.Notification.permission = notificationPermission;
};

const tearDownGlobals = () => {
  delete global.window.indexedDB;
  delete global.window.PushManager;
  delete global.navigator.serviceWorker;
  delete global.window.isSecureContext;
  delete global.Notification;
};
