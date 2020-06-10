import * as PusherPushNotifications from './push-notifications';

const DUMMY_PUSH_SUBSCRIPTION = { foo: 'bar' };
const ENCODED_DUMMY_PUSH_SUBSCRIPTION = 'eyJmb28iOiJiYXIifQ==';

describe('Constructor', () => {
  afterEach(() => {
    jest.resetModules();
    tearDownGlobals();
  });

  test('should be a function', () => {
    expect(typeof PusherPushNotifications.init).toBe('function');
  });

  test('will throw if there is no config object given', () => {
    return expect(PusherPushNotifications.init()).rejects.toThrow(
      'Config object required'
    );
  });

  test('will throw if there is no instance ID specified', () => {
    return expect(PusherPushNotifications.init({})).rejects.toThrow(
      'Instance ID is required'
    );
  });

  test('will throw if instance ID is not a string', () => {
    const instanceId = null;
    return expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Instance ID must be a string'
    );
  });

  test('will throw if the instance id is the empty string', () => {
    const instanceId = '';
    return expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Instance ID cannot be empty'
    );
  });

  test('will throw if indexedDB is not available', () => {
    setUpGlobals({ indexedDBSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'IndexedDB not supported'
    );
  });

  test('will throw if ServiceWorkerRegistration not supported', () => {
    setUpGlobals({ serviceWorkerSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Service Workers not supported'
    );
  });

  test('will throw if Web Push not supported', () => {
    setUpGlobals({ webPushSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Web Push not supported'
    );
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

    return PusherPushNotifications.init({ instanceId }).then(beamsClient => {
      expect(beamsClient.deviceId).toEqual(
        'web-1db66b8a-f51f-49de-b225-72591535c855'
      );
      expect(beamsClient.token).toEqual(ENCODED_DUMMY_PUSH_SUBSCRIPTION);
      expect(beamsClient.userId).toEqual('alice');
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

      return PusherPushNotifications.init({
        instanceId,
      })
        .then(beamsClient => beamsClient.addDeviceInterest(interest))
        .then(() => {
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
        PusherPushNotifications.init({
          instanceId,
        }).then(beamsClient => beamsClient.addDeviceInterest())
      ).rejects.toThrow('Interest name is required');
    });

    test('should fail if a interest name is not a string', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = false;
      return expect(
        PusherPushNotifications.init({
          instanceId,
        }).then(beamsClient => beamsClient.addDeviceInterest(interest))
      ).rejects.toThrow('Interest false is not a string');
    });

    test('should fail if a interest name is too long', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      let interest = '';
      for (let i = 0; i < 165; i++) {
        interest += 'A';
      }
      return expect(
        PusherPushNotifications.init({
          instanceId,
        }).then(beamsClient => beamsClient.addDeviceInterest(interest))
      ).rejects.toThrow('Interest is longer than the maximum of 164 chars');
    });

    test('should fail if interest name contains invalid characters', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'bad|interest';
      return expect(
        PusherPushNotifications.init({
          instanceId,
        }).then(beamsClient => beamsClient.addDeviceInterest(interest))
      ).rejects.toThrow('contains a forbidden character');
    });
  });

  describe('.removeDeviceInterest', () => {
    test('should make correct DELETE request', () => {
      const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
      const interest = 'donuts';

      const mockDoRequest = jest.fn();
      mockDoRequest.mockReturnValueOnce(Promise.resolve('ok'));

      dorequest.default = mockDoRequest;

      return PusherPushNotifications.init({
        instanceId,
      })
        .then(beamsClient => beamsClient.removeDeviceInterest(interest))
        .then(() => {
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

      return PusherPushNotifications.init({
        instanceId,
      })
        .then(beamsClient => beamsClient.getDeviceInterests())
        .then(interests => {
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
  });
});

const setUpGlobals = ({
  indexedDBSupport = true,
  serviceWorkerSupport = true,
  webPushSupport = true,
}) => {
  if (indexedDBSupport) {
    global.window.indexedDB = {};
  }
  if (serviceWorkerSupport) {
    global.navigator.serviceWorker = {};
    global.navigator.serviceWorker.register = () => {};
    global.navigator.serviceWorker.ready = Promise.resolve({
      pushManager: {
        getSubscription: () => Promise.resolve(DUMMY_PUSH_SUBSCRIPTION),
      },
    });
  }
  if (webPushSupport) {
    global.window.PushManager = {};
  }
};

const tearDownGlobals = () => {
  delete global.window.indexedDB;
  delete global.window.PushManager;
  delete global.navigator.serviceWorker;
};

const makeDeviceStateStore = ({ deviceId, token, userId }) => {
  class FakeDeviceStateStore {
    constructor(instanceId) {
      this.instanceId = instanceId;
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }

    async connect() {
      this._deviceId = deviceId || null;
      this._token = token || null;
      this._userId = userId || null;
    }

    async clear() {
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }

    async getDeviceId() {
      return this._deviceId;
    }

    async setDeviceId(deviceId) {
      this._deviceId = deviceId;
    }

    async getToken() {
      return this._token;
    }

    async setToken(token) {
      this._token = token;
    }

    async getUserId() {
      return this._userId;
    }

    async setUserId(userId) {
      this._userId = userId;
    }
  }

  return FakeDeviceStateStore;
};
