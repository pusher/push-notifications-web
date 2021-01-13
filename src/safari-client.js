import doRequest from './do-request';
import DeviceStateStore from './device-state-store';
import { version as sdkVersion } from '../package.json';

const __url = 'https://localhost:8080';
const __pushId = 'web.io.lees.safari-push';

export class SafariClient {
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

    if (!('indexedDB' in window)) {
      throw new Error(
        'Pusher Beams does not support this browser version (IndexedDB not supported)'
      );
    }

    if (!isSupportedVersion()) {
      throw new Error(
        'Pusher Beams does not support this safari version (Safari Push Noifications not supported)'
      );
    }

    this.instanceId = instanceId;
    this._deviceId = null;
    this._token = null;
    this._userId = null;
    this._deviceStateStore = new DeviceStateStore(instanceId);
    this._endpoint = endpointOverride; // Internal only

    this._ready = this._init();
  }

  async _init() {
    if (this._deviceId !== null) {
      return;
    }

    await this._deviceStateStore.connect();

    await this._detectSubscriptionChange();

    this._deviceId = await this._deviceStateStore.getDeviceId();
    this._token = await this._deviceStateStore.getToken();
    this._userId = await this._deviceStateStore.getUserId();
  }

  async _detectSubscriptionChange() {
    const storedToken = await this._deviceStateStore.getToken();
    const actualToken = getDeviceToken();

    const tokenHasChanged = storedToken !== actualToken;
    if (tokenHasChanged) {
      // The device token has changed. This is should only really happen when
      // users restore from an iCloud backup
      await this._deviceStateStore.clear();
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }
  }

  _requestPermission() {
    return new Promise((resolve) => {
      window.safari.pushNotification.requestPermission(
        __url,
        __pushId,
        { userID: 'abcdef' },
        resolve
      );
    });
  }

  async start() {
    if (this._deviceId !== null) {
      return this;
    }

    let { deviceToken, permission } = getPermission(__pushId);

    if (permission === 'default') {
      console.debug('permission is default, requesting permission');
      let { deviceToken, permission } = await this._requestPermission(__pushId);
      if (permission == 'granted') {
        const deviceId = await this._registerDevice(deviceToken);
        await this._deviceStateStore.setToken(deviceToken);
        await this._deviceStateStore.setDeviceId(deviceId);
        await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
        await this._deviceStateStore.setLastSeenUserAgent(
          window.navigator.userAgent
        );
        this._token = deviceToken;
        this._deviceId = deviceId;
      }
    }
  }

  async _registerDevice(deviceToken) {
    // const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
    //   this.instanceId
    // )}/devices/web`;

    // const device = {
    //   token,
    //   metadata: {
    //     sdkVersion,
    //   },
    // };

    // const options = { method: 'POST', path, body: device };
    // const response = await doRequest(options);
    // return response.id;
    return new Promise((resolve) => {
      console.debug(
        'I should be sending the device token to errol now, but that is not implemented yet'
      );
      resolve('not--a--real--device--id');
    });
  }

  async getRegistrationState() {
    await this._resolveSDKState();

    const { permission } = getPermission(__pushId);

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
    throw new Error('Not implemented');
    // if (!isSupportedBrowser()) {
    //   return;
    // }

    // await this.stop();
    // await this.start();
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Everything below can be moved to the base client
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  async getDeviceId() {
    await this._resolveSDKState();
    return this._ready.then(() => this.deviceId);
  }
  async getToken() {
    await this._resolveSDKState();
    return this._ready.then(() => this._token);
  }
  async getUserId() {
    await this._resolveSDKState();
    return this._ready.then(() => this.userId);
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  _throwIfNotStarted(message) {
    if (!this._deviceId) {
      throw new Error(
        `${message}. SDK not registered with Beams. Did you call .start?`
      );
    }
  }

  async _resolveSDKState() {
    await this._ready;
    await this._detectSubscriptionChange();
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // copied and pasted from the other client
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //
  async addDeviceInterest(interest) {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not add Device Interest');

    validateInterestName(interest);

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this._deviceId}/interests/${encodeURIComponent(interest)}`;
    const options = {
      method: 'POST',
      path,
    };
    await doRequest(options);
  }

  async removeDeviceInterest(interest) {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not remove Device Interest');

    validateInterestName(interest);

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this._deviceId}/interests/${encodeURIComponent(interest)}`;
    const options = {
      method: 'DELETE',
      path,
    };
    await doRequest(options);
  }

  async getDeviceInterests() {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not get Device Interests');

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this._deviceId}/interests`;
    const options = {
      method: 'GET',
      path,
    };
    return (await doRequest(options))['interests'] || [];
  }

  async setDeviceInterests(interests) {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not set Device Interests');

    if (interests === undefined || interests === null) {
      throw new Error('interests argument is required');
    }
    if (!Array.isArray(interests)) {
      throw new Error('interests argument must be an array');
    }
    if (interests.length > MAX_INTERESTS_NUM) {
      throw new Error(
        `Number of interests (${
          interests.length
        }) exceeds maximum of ${MAX_INTERESTS_NUM}`
      );
    }
    for (let interest of interests) {
      validateInterestName(interest);
    }

    const uniqueInterests = Array.from(new Set(interests));
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this._deviceId}/interests`;
    const options = {
      method: 'PUT',
      path,
      body: {
        interests: uniqueInterests,
      },
    };
    await doRequest(options);
  }

  async clearDeviceInterests() {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not clear Device Interests');

    await this.setDeviceInterests([]);
  }

  async setUserId(userId, tokenProvider) {
    await this._resolveSDKState();

    if (!isSupportedBrowser()) {
      return;
    }

    if (this._deviceId === null) {
      const error = new Error('.start must be called before .setUserId');
      return Promise.reject(error);
    }
    if (typeof userId !== 'string') {
      throw new Error(`User ID must be a string (was ${userId})`);
    }
    if (userId === '') {
      throw new Error('User ID cannot be the empty string');
    }
    if (this._userId !== null && this._userId !== userId) {
      throw new Error('Changing the `userId` is not allowed.');
    }

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${this._deviceId}/user`;

    const { token: beamsAuthToken } = await tokenProvider.fetchToken(userId);
    const options = {
      method: 'PUT',
      path,
      headers: {
        Authorization: `Bearer ${beamsAuthToken}`,
      },
    };
    await doRequest(options);

    this._userId = userId;
    return this._deviceStateStore.setUserId(userId);
  }

  async stop() {
    await this._resolveSDKState();

    if (!isSupportedBrowser()) {
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

  async _deleteDevice() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/web/${encodeURIComponent(this._deviceId)}`;

    const options = { method: 'DELETE', path };
    await doRequest(options);
  }

  // TODO is this ever used?
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
    )}/devices/web/${this._deviceId}/metadata`;

    const metadata = {
      sdkVersion,
    };

    const options = { method: 'PUT', path, body: metadata };
    await doRequest(options);

    await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
    await this._deviceStateStore.setLastSeenUserAgent(userAgent);
  }
}

function isSupportedVersion() {
  return 'safari' in window && 'pushNotification' in window.safari;
}

// TODO should be in base client
const validateInterestName = (interest) => {
  if (interest === undefined || interest === null) {
    throw new Error('Interest name is required');
  }
  if (typeof interest !== 'string') {
    throw new Error(`Interest ${interest} is not a string`);
  }
  if (!INTERESTS_REGEX.test(interest)) {
    throw new Error(
      `interest "${interest}" contains a forbidden character. ` +
        'Allowed characters are: ASCII upper/lower-case letters, ' +
        'numbers or one of _-=@,.;'
    );
  }
  if (interest.length > MAX_INTEREST_LENGTH) {
    throw new Error(
      `Interest is longer than the maximum of ${MAX_INTEREST_LENGTH} chars`
    );
  }
};

function getPermission(pushId) {
  return window.safari.pushNotification.permission(pushId);
}
function getDeviceToken() {
  const { deviceToken } = window.safari.pushNotification.permission(__pushId);
  return deviceToken;
}
