import doRequest from './do-request';
import TokenProvider from './token-provider';
import DeviceStateStore from './device-state-store';
import { version as sdkVersion } from '../package.json';

const SERVICE_WORKER_URL = `/service-worker.js?pusherBeamsWebSDKVersion=${sdkVersion}`;

export async function init(config) {
  if (!config) {
    throw new Error('Config object required');
  }
  const {
    instanceId,
    endpointOverride = null,
    serviceWorkerRegistration = null,
  } = config;

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

  const deviceStateStore = new DeviceStateStore(instanceId);
  await deviceStateStore.connect();

  const deviceId = await deviceStateStore.getDeviceId();
  const token = await deviceStateStore.getToken();
  const userId = await deviceStateStore.getUserId();

  const instance = new PushNotificationsInstance({
    instanceId,
    deviceId,
    token,
    userId,
    serviceWorkerRegistration,
    deviceStateStore,
    endpointOverride,
  });

  const deviceExists = deviceId !== null;
  if (deviceExists) {
    try {
      await instance._updateDeviceMetadata();
    } catch (_) {
      // Best effort, do nothing if this fails.
    }
  }

  return instance;
}

class PushNotificationsInstance {
  constructor({
    instanceId,
    deviceId,
    token,
    userId,
    serviceWorkerRegistration,
    deviceStateStore,
    endpointOverride = null,
  }) {
    this.instanceId = instanceId;
    this.deviceId = deviceId;
    this.token = token;
    this.userId = userId;
    this._serviceWorkerRegistration = serviceWorkerRegistration;
    this._deviceStateStore = deviceStateStore;

    this._endpoint = endpointOverride; // Internal only
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  async start() {
    // Temporary whilst we only support Chrome in Beta release
    if (!isSupportedBrowser()) {
      console.warn(
        'Pusher Web Push Notifications only supports Google Chrome (whilst in Beta)'
      );
      return this;
    }

    if (this.deviceId !== null) {
      return this;
    }

    const { vapidPublicKey: publicKey } = await this._getPublicKey();

    // register with pushManager, get endpoint etc
    const token = await this._getPushToken(publicKey);

    // get device id from errol
    const deviceId = await this._registerDevice(token);

    await this._deviceStateStore.setToken(token);
    await this._deviceStateStore.setDeviceId(deviceId);
    await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
    await this._deviceStateStore.setLastSeenUserAgent(
      window.navigator.userAgent
    );

    this.token = token;
    this.deviceId = deviceId;
    return this;
  }

  async setUserId(userId, tokenProvider) {
    // Temporary whilst we only support Chrome in Beta release
    if (!isSupportedBrowser()) {
      console.warn(
        'Pusher Web Push Notifications only supports Google Chrome (whilst in Beta)'
      );
      return;
    }

    if (this.deviceId === null) {
      const error = new Error('.start must be called before .setUserId');
      return Promise.reject(error);
    }

    if (this.userId !== null && this.userId !== userId) {
      throw new Error('Changing the `userId` is not allowed.');
    }

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this.deviceId}/user`;

    const { token: beamsAuthToken } = await tokenProvider.fetchToken(userId);
    const options = {
      method: 'PUT',
      path,
      headers: {
        Authorization: `Bearer ${beamsAuthToken}`,
      },
    };
    await doRequest(options);

    this.userId = userId;
    return this._deviceStateStore.setUserId(userId);
  }

  async stop() {
    // Temporary whilst we only support Chrome in Beta release
    if (!isSupportedBrowser()) {
      console.warn(
        'Pusher Web Push Notifications only supports Google Chrome (whilst in Beta)'
      );
      return;
    }

    if (this.deviceId === null) {
      return;
    }

    await this._deleteDevice();

    await this._deviceStateStore.clear();

    this.deviceId = null;
    this.token = null;
    this.userId = null;
  }

  async clearAllState() {
    // Temporary whilst we only support Chrome in Beta release
    if (!isSupportedBrowser()) {
      console.warn(
        'Pusher Web Push Notifications only supports Google Chrome (whilst in Beta)'
      );
      return;
    }

    await this.stop();
    await this.start();
  }

  async _getPublicKey() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/web-vapid-public-key`;

    const options = { method: 'GET', path };
    return doRequest(options);
  }

  async _getPushToken(publicKey) {
    try {
      if (this._serviceWorkerRegistration) {
        // TODO: Call update only when we detect an SDK change
      } else {
        // Check that service worker file exists
        const { status: swStatusCode } = await fetch(SERVICE_WORKER_URL);
        if (swStatusCode !== 200) {
          throw new Error(
            'Cannot start SDK, service worker missing: No file found at /service-worker.js'
          );
        }

        window.navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          // explicitly opting out of `importScripts` caching just in case our
          // customers decides to host and serve the imported scripts and
          // accidentally set `Cache-Control` to something other than `max-age=0`
          updateViaCache: 'none',
        });
      }
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

    const device = {
      token,
      metadata: {
        sdkVersion,
      },
    };

    const options = { method: 'POST', path, body: device };
    const response = await doRequest(options);
    return response.id;
  }

  async _deleteDevice() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${encodeURIComponent(this.deviceId)}`;

    const options = { method: 'DELETE', path };
    await doRequest(options);
  }

  /**
   * Submit SDK version and browser details (via the user agent) to Pusher Beams.
   */
  async _updateDeviceMetadata() {
    const userAgent = window.navigator.userAgent;
    const storedUserAgent = await this._deviceStateStore.getLastSeenUserAgent();
    const storedSdkVersion = await this._deviceStateStore.getLastSeenSdkVersion();

    if (userAgent === storedUserAgent && sdkVersion === storedSdkVersion) {
      // Nothing to do
      return;
    }

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this.deviceId}/metadata`;

    const metadata = {
      sdkVersion,
    };

    const options = { method: 'PUT', path, body: metadata };
    await doRequest(options);

    await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
    await this._deviceStateStore.setLastSeenUserAgent(userAgent);
  }
}

function urlBase64ToUInt8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Modified from https://stackoverflow.com/questions/4565112
 */
function isSupportedBrowser() {
  const winNav = window.navigator;
  const vendorName = winNav.vendor;

  const isChromium =
    window.chrome !== null && typeof window.chrome !== 'undefined';
  const isOpera = winNav.userAgent.indexOf('OPR') > -1;
  const isIEedge = winNav.userAgent.indexOf('Edge') > -1;

  const isChrome =
    isChromium && vendorName === 'Google Inc.' && !isIEedge && !isOpera;

  return isChrome || isOpera;
}

export { TokenProvider };
