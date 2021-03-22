import doRequest from './do-request';
import BaseClient from './base-client';
import { version as sdkVersion } from '../package.json';
import { RegistrationState } from './base-client';

const SERVICE_WORKER_URL = `/service-worker.js?pusherBeamsWebSDKVersion=${sdkVersion}`;
const platform = 'web';

export class WebPushClient extends BaseClient {
  constructor(config) {
    super(config, platform);

    this.error = null;
    if (!window.isSecureContext) {
      this.error =
        'Pusher Beams relies on Service Workers, which only work in secure contexts. Check that your page is being served from localhost/over HTTPS';
      return;
    }

    if (!('serviceWorker' in navigator)) {
      this.error =
        'Pusher Beams does not support this browser version (Service Workers not supported)';
      return;
    }

    if (!('PushManager' in window)) {
      this.error =
        'Pusher Beams does not support this browser version (Web Push not supported)';
      return;
    }

    const { serviceWorkerRegistration = null } = config;

    if (serviceWorkerRegistration) {
      const serviceWorkerScope = serviceWorkerRegistration.scope;
      const currentURL = window.location.href;
      const scopeMatchesCurrentPage = currentURL.startsWith(serviceWorkerScope);
      if (!scopeMatchesCurrentPage) {
        this.error = `Could not initialize Pusher web push: current page not in serviceWorkerRegistration scope (${serviceWorkerScope})`;
        return;
      }
    }
    this._serviceWorkerRegistration = serviceWorkerRegistration;
    this._ready = this._init();
  }

  async _init() {
    if (this._deviceId !== null) {
      return;
    }

    await this._deviceStateStore.connect();

    if (this._serviceWorkerRegistration) {
      // If we have been given a service worker, wait for it to be ready
      await window.navigator.serviceWorker.ready;
    } else {
      // Otherwise register our own one
      this._serviceWorkerRegistration = await getServiceWorkerRegistration();
    }

    await this._detectSubscriptionChange();

    this._deviceId = await this._deviceStateStore.getDeviceId();
    this._token = await this._deviceStateStore.getToken();
    this._userId = await this._deviceStateStore.getUserId();
  }

  async _detectSubscriptionChange() {
    const storedToken = await this._deviceStateStore.getToken();
    const actualToken = await getWebPushToken(this._serviceWorkerRegistration);

    const pushTokenHasChanged = storedToken !== actualToken;

    if (pushTokenHasChanged) {
      // The web push subscription has changed out from underneath us.
      // This can happen when the user disables the web push permission
      // (potentially also renabling it, thereby changing the token)
      //
      // This means the SDK has effectively been stopped, so we should update
      // the SDK state to reflect that.
      await this._deviceStateStore.clear();
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }
  }

  async start() {
    await this._resolveSDKState();

    if (!this._isSupportedBrowser()) {
      return this;
    }

    if (this._deviceId !== null) {
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

    this._token = token;
    this._deviceId = deviceId;
    return this;
  }

  async getRegistrationState() {
    await this._resolveSDKState();

    if (Notification.permission === 'denied') {
      return RegistrationState.PERMISSION_DENIED;
    }

    if (Notification.permission === 'granted' && this._deviceId !== null) {
      return RegistrationState.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS;
    }

    if (Notification.permission === 'granted' && this._deviceId === null) {
      return RegistrationState.PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS;
    }

    return RegistrationState.PERMISSION_PROMPT_REQUIRED;
  }

  async stop() {
    await this._resolveSDKState();

    if (!this._isSupportedBrowser()) {
      return;
    }

    if (this._deviceId === null) {
      return;
    }

    await this._deleteDevice();
    await this._deviceStateStore.clear();
    this._clearPushToken().catch(() => {}); // Not awaiting this, best effort.

    this._deviceId = null;
    this._token = null;
    this._userId = null;
  }

  async clearAllState() {
    if (!this._isSupportedBrowser()) {
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
      // The browser might already have a push subscription to different key.
      // Lets clear it out first.
      await this._clearPushToken();
      const sub = await this._serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUInt8Array(publicKey),
      });
      return btoa(JSON.stringify(sub));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async _clearPushToken() {
    return navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) sub.unsubscribe();
      });
  }

  async _registerDevice(token) {
    return await super._registerDevice({
      token,
      metadata: {
        sdkVersion,
      },
    });
  }

  /**
   * Modified from https://stackoverflow.com/questions/4565112
   */
  _isSupportedBrowser() {
    const winNav = window.navigator;
    const vendorName = winNav.vendor;

    const isChromium =
      window.chrome !== null && typeof window.chrome !== 'undefined';
    const isOpera = winNav.userAgent.indexOf('OPR') > -1;
    const isEdge = winNav.userAgent.indexOf('Edg') > -1;
    const isFirefox = winNav.userAgent.indexOf('Firefox') > -1;

    const isChrome =
      isChromium && vendorName === 'Google Inc.' && !isEdge && !isOpera;

    const isSupported = isChrome || isOpera || isFirefox || isEdge;

    if (!isSupported) {
      console.warn(
        'Pusher Web Push Notifications supports Chrome, Firefox, Edge and Opera.'
      );
    }
    return isSupported;
  }

  async isSupportedBrowser() {
    await this._ready;
    return this.error === null;
  }
}

async function getServiceWorkerRegistration() {
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
  return window.navigator.serviceWorker.ready;
}

function getWebPushToken(swReg) {
  return swReg.pushManager
    .getSubscription()
    .then(sub => (!sub ? null : encodeSubscription(sub)));
}

function encodeSubscription(sub) {
  return btoa(JSON.stringify(sub));
}

function urlBase64ToUInt8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
