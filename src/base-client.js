import doRequest from './do-request';
import { version as sdkVersion } from '../package.json';
import DeviceStateStore from './device-state-store';

const INTERESTS_REGEX = new RegExp('^(_|\\-|=|@|,|\\.|;|[A-Z]|[a-z]|[0-9])*$');
const MAX_INTEREST_LENGTH = 164;
const MAX_INTERESTS_NUM = 5000;

export const RegistrationState = Object.freeze({
  PERMISSION_PROMPT_REQUIRED: 'PERMISSION_PROMPT_REQUIRED',
  PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS:
    'PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS',
  PERMISSION_GRANTED_REGISTERED_WITH_BEAMS:
    'PERMISSION_GRANTED_REGISTERED_WITH_BEAMS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
});

/* BaseClient is an abstract client containing functionality shared between
 * safari and web push clients. Platform specific classes should extend this
 * class. This method expects sub classes to implement the following public
 * methods:
 * async start()
 * async getRegistrationState() {
 * async stop() {
 * async clearAllState() {
 *
 * It also assumes that the following private methods are implemented:
 * async _init()
 * async _detectSubscriptionChange()
 */
export default class BaseClient {
  constructor(config, platform) {
    if (this.constructor === BaseClient) {
      throw new Error(
        'BaseClient is abstract and should not be directly constructed.'
      );
    }

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
    this.instanceId = instanceId;
    this._deviceId = null;
    this._token = null;
    this._userId = null;
    this._deviceStateStore = new DeviceStateStore(instanceId);
    this._endpoint = endpointOverride; // Internal only
    this._platform = platform;
  }

  async getDeviceId() {
    await this._resolveSDKState();
    return this._ready.then(() => this._deviceId);
  }
  async getToken() {
    await this._resolveSDKState();
    return this._ready.then(() => this._token);
  }

  async getUserId() {
    await this._resolveSDKState();
    return this._ready.then(() => this._userId);
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

  async addDeviceInterest(interest) {
    await this._resolveSDKState();
    this._throwIfNotStarted('Could not add Device Interest');

    validateInterestName(interest);

    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/${this._platform}/${
      this._deviceId
    }/interests/${encodeURIComponent(interest)}`;
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
    )}/devices/${this._platform}/${
      this._deviceId
    }/interests/${encodeURIComponent(interest)}`;
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
    )}/devices/${this._platform}/${this._deviceId}/interests`;
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
    )}/devices/${this._platform}/${this._deviceId}/interests`;
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

  async _deleteDevice() {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/${this._platform}/${encodeURIComponent(this._deviceId)}`;

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
    )}/devices/${this._platform}/${this._deviceId}/metadata`;

    const metadata = {
      sdkVersion,
    };

    const options = { method: 'PUT', path, body: metadata };
    await doRequest(options);

    await this._deviceStateStore.setLastSeenSdkVersion(sdkVersion);
    await this._deviceStateStore.setLastSeenUserAgent(userAgent);
  }

  async _registerDevice(device) {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/${this._platform}`;
    const options = { method: 'POST', path, body: device };
    const response = await doRequest(options);
    return response.id;
  }

  async setUserId(userId, tokenProvider) {
    await this._resolveSDKState();

    if (!this._isSupportedBrowser()) {
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

  async start() {
    throwNotImplementedError('start');
  }
  async getRegistrationState() {
    throwNotImplementedError('getRegistrationState');
  }
  async stop() {
    throwNotImplementedError('stop');
  }
  async clearAllState() {
    throwNotImplementedError('clearAllState');
  }
}

function throwNotImplementedError(method) {
  throw new Error(
    `${method} not implemented on abstract BaseClient.` +
      'Instantiate either WebPushClient or SafariClient'
  );
}

function validateInterestName(interest) {
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
}
