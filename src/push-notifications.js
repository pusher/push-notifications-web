import doRequest from './doRequest';
import TokenProvider from './token-provider';

export function init(config) {
  return new Client(config);
}

export class Client {
  constructor(config) {
    if (!config) {
      throw new Error('Config object required');
    }
    const { instanceId, endpointOverride = null } = config;

    if (instanceId === undefined) {
      throw new Error('Instance ID is required');
    }
    if (typeof instanceId !== 'string') {
      throw new Error('Instance ID must be a string');
    }
    if (instanceId.length === 0) {
      throw new Error('Instance ID cannot be empty');
    }

    if (!window.indexedDB) {
      throw new Error(
        'Pusher Beams does not support this browser version (IndexedDB not supported)'
      );
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      throw new Error(
        'Pusher Beams does not support this browser version (ServiceWorkerRegistration not supported)'
      );
    }

    if (!('PushManager' in window)) {
      throw new Error(
        'Pusher Beams does not support this browser version (PushManager not supported)'
      );
    }

    this.instanceId = instanceId;
    this.deviceId = null;
    this.token = null;
    this._db = null;

    this._endpoint = endpointOverride; // Internal only

    return this._initDb()
      .then(db => (this._db = db))
      .then(() => this._readSDKState())
      .then(sdkState => {
        if (sdkState !== null) {
          this.token = sdkState.token;
          this.deviceId = sdkState.device_id;
        }
      })
      .then(() => this);
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  async start() {
    if (this.deviceId !== null) {
      return;
    }

    const { vapidPublicKey: publicKey } = await this._getPublicKey();

    // register with pushManager, get endpoint etc
    const token = await this._getPushToken(publicKey);

    // get device id from errol
    const deviceId = await this._registerDevice(token);

    await this._writeSDKState(this.instanceId, token, deviceId, null);

    this.token = token;
    this.deviceId = deviceId;
  }

  async setUserId(userId, tokenProvider) {
    const { token } = await tokenProvider.fetchToken(userId);

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this.deviceId}/user`;
    let response = await doRequest('PUT', path, null, {
      Authorization: `Bearer ${token}`,
    });

    return this._writeSDKState(
      this.instanceId,
      this.token,
      this.deviceId,
      userId
    );
  }

  async _getPublicKey() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/web-vapid-public-key`;

    return doRequest('GET', path);
  }

  async _getPushToken(publicKey) {
    try {
      window.navigator.serviceWorker.register('sw.js');
      const reg = await window.navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUInt8Array(publicKey),
      });
      return btoa(JSON.stringify(sub));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async _registerDevice(token) {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web`;

    const response = await doRequest('POST', path, { token });

    return response.id;
  }

  _initDb() {
    const dbName = `beams-${this.instanceId}`;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = event => {
        const error = new Error(`Database error: ${event.target.error}`);
        reject(error);
      };

      request.onsuccess = event => {
        const db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        const objectStore = db.createObjectStore('beams', {
          keyPath: 'instance_id',
        });
        objectStore.createIndex('instance_id', 'instance_id', {
          unique: true,
        });
        objectStore.createIndex('token', 'token', { unique: true });
        objectStore.createIndex('device_id', 'device_id', { unique: true });
        objectStore.createIndex('user_id', 'user_id', { unique: true });
      };
    });
  }

  _writeSDKState(instanceId, token, deviceId, userId) {
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction('beams', 'readwrite')
        .objectStore('beams')
        .put({
          instance_id: instanceId,
          token: token,
          device_id: deviceId,
          user_id: userId,
        });

      request.onsuccess = _ => {
        resolve();
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  _readSDKState() {
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction('beams')
        .objectStore('beams')
        .get(this.instanceId);

      request.onsuccess = event => {
        resolve(event.target.result || null);
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }
}

function urlBase64ToUInt8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export { TokenProvider };
