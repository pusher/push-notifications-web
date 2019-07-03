export default class DeviceStateStore {
  constructor(instanceId) {
    this._instanceId = instanceId;
    this._dbConn = null;
  }

  get _dbName() {
    return `beams-${this._instanceId}`;
  }

  get isConnected() {
    return this._dbConn !== null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName);

      request.onsuccess = event => {
        const db = event.target.result;
        this._dbConn = db;

        this._readState()
          .then(state => (state === null ? this.clear() : Promise.resolve()))
          .then(resolve);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        db.createObjectStore('beams', {
          keyPath: 'instance_id',
        });
      };

      request.onerror = event => {
        const error = new Error(`Database error: ${event.target.error}`);
        reject(error);
      };
    });
  }

  clear() {
    return this._writeState({
      instance_id: this._instanceId,
      device_id: null,
      token: null,
      user_id: null,
    });
  }

  _readState() {
    if (!this.isConnected) {
      throw new Error(
        'Cannot read value: DeviceStateStore not connected to IndexedDB'
      );
    }

    return new Promise((resolve, reject) => {
      const request = this._dbConn
        .transaction('beams')
        .objectStore('beams')
        .get(this._instanceId);

      request.onsuccess = event => {
        const state = event.target.result;
        if (!state) {
          resolve(null);
        }
        resolve(state);
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  async _readProperty(name) {
    const state = await this._readState();
    if (state === null) {
      return null;
    }
    return state[name] || null;
  }

  _writeState(state) {
    if (!this.isConnected) {
      throw new Error(
        'Cannot write value: DeviceStateStore not connected to IndexedDB'
      );
    }

    return new Promise((resolve, reject) => {
      const request = this._dbConn
        .transaction('beams', 'readwrite')
        .objectStore('beams')
        .put(state);

      request.onsuccess = _ => {
        resolve();
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  async _writeProperty(name, value) {
    const state = await this._readState();
    state[name] = value;
    await this._writeState(state);
  }

  getToken() {
    return this._readProperty('token');
  }

  setToken(token) {
    return this._writeProperty('token', token);
  }

  getDeviceId() {
    return this._readProperty('device_id');
  }

  setDeviceId(deviceId) {
    return this._writeProperty('device_id', deviceId);
  }

  getUserId() {
    return this._readProperty('user_id');
  }

  setUserId(userId) {
    return this._writeProperty('user_id', userId);
  }

  getLastSeenSdkVersion() {
    return this._readProperty('last_seen_sdk_version');
  }

  setLastSeenSdkVersion(sdkVersion) {
    return this._writeProperty('last_seen_sdk_version', sdkVersion);
  }

  getLastSeenUserAgent() {
    return this._readProperty('last_seen_user_agent');
  }

  setLastSeenUserAgent(userAgent) {
    return this._writeProperty('last_seen_user_agent', userAgent);
  }
}
