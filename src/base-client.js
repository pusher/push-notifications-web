import doRequest from './do-request';
import { version as sdkVersion } from '../package.json';

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

export default class BaseClient {
  constructor(_) {}

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

  async _registerDevice(deviceToken) {
    const path = `${this._baseURL}/device_api/v1/instances/${encodeURIComponent(
      this.instanceId
    )}/devices/${this._platform}`;

    const device = {
      deviceToken,
      metadata: {
        sdkVersion,
      },
    };

    const options = { method: 'POST', path, body: device };
    const response = await doRequest(options);
    return response.id;
  }
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
