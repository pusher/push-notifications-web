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

    this.instanceId = instanceId;
    this._endpoint = endpointOverride; // Internal only

    this._initDb('beams');
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  async start() {
    const { vapidPublicKey: publicKey } = await this._getPublicKey();

    // register with pushManager, get endpoint etc
    const token = await this._getPushToken(publicKey);

    // get device id from errol
    const response = await this._registerDevice(token);
    // // put response.id in indexedDB
    this.deviceId = response;

    this._save(this.instanceId, token, this.deviceId);
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
    var request = indexedDB.open(dbName);

    request.onerror = function(event) {
      console.error(`Database error: ${event.target.errorCode}`);
    };

    request.onsuccess = function(event) {
      db = event.target.result;
    };

    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      var objectStore = db.createObjectStore('beams', {
        keyPath: 'instance_id',
      });
      objectStore.createIndex('instance_id', 'instance_id', { unique: true });
      objectStore.createIndex('token', 'token', { unique: true });
      objectStore.createIndex('device_id', 'device_id', { unique: true });
    };
  }

  _save(instanceId, token, deviceId) {
    var request = db
      .transaction('beams', 'readwrite')
      .objectStore('beams')
      .add({
        instance_id: instanceId,
        token: token,
        device_id: deviceId,
      });

    request.onsuccess = function(event) {
      // TODO
    };

    request.onerror = function(event) {
      console.error(`Database error: ${event.target.errorCode}`);
    };
  }

  _read(instanceId) {
    db
      .transaction('beams')
      .objectStore('beams')
      .get(instanceId).onsuccess = function(event) {
      result = event.target.result;
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
