import doRequest from './doRequest';

export class PushNotifications {
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

    // initDB();
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
}

function urlBase64ToUInt8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
