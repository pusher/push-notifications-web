import * as PusherPushNotifications from './push-notifications';

describe('Constructor', () => {
  afterEach(() => {
    jest.resetModules();
    tearDownGlobals();
  });

  test('should be a function', () => {
    expect(typeof PusherPushNotifications.init).toBe('function');
  });

  test('will throw if there is no config object given', () => {
    expect(PusherPushNotifications.init()).rejects.toThrow(
      'Config object required'
    );
  });

  test('will throw if there is no instance ID specified', () => {
    expect(PusherPushNotifications.init({})).rejects.toThrow(
      'Instance ID is required'
    );
  });

  test('will throw if instance ID is not a string', () => {
    const instanceId = null;
    expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Instance ID must be a string'
    );
  });

  test('will throw if the instance id is the empty string', () => {
    const instanceId = '';
    expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Instance ID cannot be empty'
    );
  });

  test('will throw if indexedDB is not available', () => {
    setUpGlobals({ indexedDBSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'IndexedDB not supported'
    );
  });

  test('will throw if ServiceWorkerRegistration not supported', () => {
    setUpGlobals({ serviceWorkerSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Service Workers not supported'
    );
  });

  test('will throw if Web Push not supported', () => {
    setUpGlobals({ webPushSupport: false });
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    expect(PusherPushNotifications.init({ instanceId })).rejects.toThrow(
      'Web Push not supported'
    );
  });

  test('will return properly configured instance otherwise', () => {
    const PusherPushNotifications = require('./push-notifications');
    const devicestatestore = require('./device-state-store');

    setUpGlobals({});

    devicestatestore.default = makeDeviceStateStore({
      deviceId: 'web-1db66b8a-f51f-49de-b225-72591535c855',
      token: 'some-token',
      userId: 'alice',
    });

    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';

    return PusherPushNotifications.init({ instanceId }).then(beamsClient => {
      expect(beamsClient.deviceId).toEqual(
        'web-1db66b8a-f51f-49de-b225-72591535c855'
      );
      expect(beamsClient.token).toEqual('some-token');
      expect(beamsClient.userId).toEqual('alice');
    });
  });
});

describe('.addDeviceInterests', () => {
  const PusherPushNotifications = require('./push-notifications');
  const devicestatestore = require('./device-state-store');

  beforeEach(() => {
    devicestatestore.default = makeDeviceStateStore({
      deviceId: 'web-1db66b8a-f51f-49de-b225-72591535c855',
      token: 'some-token',
      userId: 'alice',
    });
    setUpGlobals({});
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('should fail if interests array is not passed', () => {
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return PusherPushNotifications.init({
      instanceId,
    }).then(beamsClient => {
      expect(beamsClient.addDeviceInterests()).rejects.toThrow(
        'Interests array is required'
      );
    });
  });

  test('should fail if interests array is not passed', () => {
    const instanceId = 'df3c1965-e870-4bd6-8d75-fea56b26335f';
    return PusherPushNotifications.init({
      instanceId,
    }).then(beamsClient => {
      const interests = 'not-an-array';
      expect(beamsClient.addDeviceInterests(interests)).rejects.toThrow(
        'Interests argument must be an array'
      );
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
