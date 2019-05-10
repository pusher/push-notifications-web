import doRequest from './doRequest';

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

  get _dbName() {
    return `beams-${this.instanceId}`;
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

    await this._writeSDKState(this.instanceId, token, deviceId);

    this.token = token;
    this.deviceId = deviceId;
  }

  async stop() {
    await this._deleteDevice();

    await this._clearDb();

    this.deviceId = null;
    this.token = null;
  }

  async clearAllState() {
    await this.stop();
    await this.start();
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

  async _deleteDevice() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${encodeURIComponent(this.deviceId)}`;

    await doRequest('DELETE', path);
  }

  async _initDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName);

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
        objectStore.createIndex('device_id', 'device_id', {
          unique: true,
        });
      };
    });
  }

  async _clearDb() {
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction('beams', 'readwrite')
        .objectStore('beams')
        .clear();

      request.onsuccess = _ => {
        resolve();
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  _writeSDKState(instanceId, token, deviceId) {
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction('beams', 'readwrite')
        .objectStore('beams')
        .add({
          instance_id: instanceId,
          token: token,
          device_id: deviceId,
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
