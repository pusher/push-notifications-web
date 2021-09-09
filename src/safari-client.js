import doRequest from './do-request';
import BaseClient from './base-client';
import { version as sdkVersion } from '../package.json';
import { RegistrationState } from './base-client';

const platform = 'safari';

export class SafariClient extends BaseClient {
  constructor(config) {
    super(config, platform);
    this._ready = this._init();
  }

  async _init() {
    this.error = null;
    if (!this._isSupportedBrowser()) {
      this.error = 'Pusher Beams does not support this Safari version';
      return;
    }

    this._websitePushId = await this._fetchWebsitePushId();
    if (this._websitePushId === null) {
      this.error =
        'Safari credentials are not configured for this Pusher Beams instance';
      return;
    }

    this._serviceUrl = `${
      this._baseURL
    }/safari_api/v1/instances/${encodeURIComponent(this.instanceId)}`;

    if (this._deviceId !== null) {
      return;
    }

    await this._deviceStateStore.connect();
    await this._detectSubscriptionChange();

    this._deviceId = await this._deviceStateStore.getDeviceId(
      this._websitePushId
    );
    this._token = await this._deviceStateStore.getToken();
    this._userId = await this._deviceStateStore.getUserId();
  }

  async _detectSubscriptionChange() {
    const storedToken = await this._deviceStateStore.getToken();
    const { deviceToken: actualToken } = getCurrentPermission(
      this._websitePushId
    );

    const tokenHasChanged = storedToken !== actualToken;
    if (tokenHasChanged) {
      // The device token has changed. This could be because the user has
      // rescinded permission, or because the user has restored from a backup.
      // Either way we should clear out the old state
      await this._deviceStateStore.clear();
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }
  }

  _requestPermission() {
    // Check to see whether we've already asked for permission, if we have we
    // can't ask again
    let { deviceToken, permission } = getCurrentPermission(this._websitePushId);
    if (permission !== 'default') {
      return Promise.resolve({ deviceToken, permission });
    }
    return new Promise((resolve, reject) => {
      try {
        window.safari.pushNotification.requestPermission(
          this._serviceUrl,
          this._websitePushId,
          {},
          resolve
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  async start() {
    await this._ready;

    if (this._deviceId !== null) {
      return this;
    }

    let { deviceToken, permission } = await this._requestPermission();
    if (permission == 'granted') {
      const deviceId = await this._registerDevice(
        deviceToken,
        this._websitePushId
      );
      await this._deviceStateStore.setToken(deviceToken);
      await this._deviceStateStore.setDeviceId(deviceId);
      await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
      await this._deviceStateStore.setLastSeenUserAgent(
        window.navigator.userAgent
      );
      this._token = deviceToken;
      this._deviceId = deviceId;
    } else if (permission === 'denied') {
      throw new Error('Registration failed - permission denied');
    }
    return this;
  }

  async getRegistrationState() {
    await this._resolveSDKState();

    const { permission } = getCurrentPermission(this._websitePushId);

    if (permission === 'denied') {
      return RegistrationState.PERMISSION_DENIED;
    }

    if (permission === 'granted' && this._deviceId !== null) {
      return RegistrationState.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS;
    }

    if (permission === 'granted' && this._deviceId === null) {
      return RegistrationState.PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS;
    }

    return RegistrationState.PERMISSION_PROMPT_REQUIRED;
  }

  async clearAllState() {
    if (!this._isSupportedBrowser()) {
      return;
    }

    await this._deleteDevice();
    await this._deviceStateStore.clear();

    this._deviceId = null;
    this._token = null;
    this._userId = null;
  }

  async stop() {
    await this._resolveSDKState();

    if (!this._isSupportedBrowser()) {
      return;
    }

    if (this._deviceId === null) {
      return;
    }
    await this.clearAllState();
  }

  async _registerDevice(token, websitePushId) {
    return await super._registerDevice({
      token,
      websitePushId,
      metadata: {
        sdkVersion,
      },
    });
  }

  async _fetchWebsitePushId() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/safari-website-push-id`;

    const options = { method: 'GET', path };
    try {
      let { websitePushId } = await doRequest(options);
      return websitePushId;
    } catch (err) {
      if (err.message.match(/Unexpected status code 404/)) {
        return null;
      }
      throw err;
    }
  }

  _isSupportedBrowser() {
    return (
      'safari' in window &&
      'pushNotification' in window.safari &&
      'indexedDB' in window
    );
  }

  async isSupportedBrowser() {
    await this._ready;
    return this.error === null;
  }
}

function getCurrentPermission(websitePushId) {
  return window.safari.pushNotification.permission(websitePushId);
}
