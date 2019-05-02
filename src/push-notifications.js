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
    this._endpoint = endpointOverride; // Internal only

    beamsDatabaseExists().then(exists => {
      if (!exists) {
        this._initDb('beams');
      }
    });
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  async start() {
    const exists = await beamsDatabaseExists();
    if (exists) {
      const { token = null, deviceId = null } = this._read(this.instanceId);
      if (token !== null && deviceId !== null) {
        this.token = token;
        this.deviceId = deviceId;
        return;
      }
    }

    const { vapidPublicKey: publicKey } = await this._getPublicKey();

    // register with pushManager, get endpoint etc
    const token = await this._getPushToken(publicKey);

    // get device id from errol
    const deviceId = await this._registerDevice(token);

    this._save(this.instanceId, token, deviceId);
  }

  async _getPublicKey() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/web-vapid-public-key`;
    return doRequest('GET', path);
  }

  async _getPushToken(publicKey) {
    let sub;
    try {
      window.navigator.serviceWorker.register('sw.js');
      const reg = await window.navigator.serviceWorker.ready;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUInt8Array(publicKey),
      });
    } catch (e) {
      return Promise.reject(e);
    }

    return btoa(JSON.stringify(sub));
  }

  async _registerDevice(token) {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web`;

    return doRequest('POST', path, { token });
  }

  _initDb(dbName) {
    const request = indexedDB.open(dbName);

    request.onerror = event => {
      console.error(`Database error: ${event.target.errorCode}`);
    };

    request.onsuccess = event => {
      this.db = event.target.result;
    };

    request.onupgradeneeded = event => {
      const db = event.target.result;
      const objectStore = db.createObjectStore('beams', {
        keyPath: 'instance_id',
      });
      objectStore.createIndex('instance_id', 'instance_id', { unique: true });
      objectStore.createIndex('token', 'token', { unique: true });
      objectStore.createIndex('device_id', 'device_id', { unique: true });
    };
  }

  _save(instanceId, token, deviceId) {
    const request = this.db
      .transaction('beams', 'readwrite')
      .objectStore('beams')
      .add({
        instance_id: instanceId,
        token: token,
        device_id: deviceId,
      });

    request.onsuccess = event => {
      // TODO
    };

    request.onerror = event => {
      console.error(`Database error: ${event.target.errorCode}`);
    };
  }

  _read(instanceId) {
    this.db
      .transaction('beams')
      .objectStore('beams')
      .get(instanceId).onsuccess = event => {
      const result = event.target.result;
      return { token: result.token, deviceId: result.device_id };
    };
  }
}

function urlBase64ToUInt8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function beamsDatabaseExists() {
  const databases = await indexedDB.databases().catch(error => {
    throw new Error('Problem accessing database');
  });

  return databases.some(arrVal => {
    return 'beams' === arrVal.name;
  });
}
