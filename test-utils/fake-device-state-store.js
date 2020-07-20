export const makeDeviceStateStore = ({ deviceId, token, userId }) => {
  class FakeDeviceStateStore {
    constructor(instanceId) {
      this.instanceId = instanceId;
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }

    async connect() {
      this._deviceId = deviceId || null;
      this._token = token || null;
      this._userId = userId || null;
    }

    async clear() {
      this._deviceId = null;
      this._token = null;
      this._userId = null;
    }

    async getDeviceId() {
      return this._deviceId;
    }

    async setDeviceId(deviceId) {
      this._deviceId = deviceId;
    }

    async getToken() {
      return this._token;
    }

    async setToken(token) {
      this._token = token;
    }

    async getUserId() {
      return this._userId;
    }

    async setUserId(userId) {
      this._userId = userId;
    }
  }

  return FakeDeviceStateStore;
};
