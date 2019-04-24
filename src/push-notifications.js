import doRequest from "./doRequest";

export default class PushNotifications {
  constructor(config) {
    if (!config) {
      throw new Error("Config object required");
    }
    const { instanceId, endpointOverride = null } = config;

    if (instanceId === undefined) {
      throw new Error("Instance ID is required");
    }
    if (typeof instanceId !== "string") {
      throw new Error("Instance ID must be a string");
    }
    if (instanceId.length === 0) {
      throw new Error("Instance ID cannot be empty");
    }

    this.instanceId = instanceId;
    this._endpoint = endpointOverride; // Internal only

    // initDB();
  }

  get _baseURL() {
    if (this._endpoint !== null) {
      return this._endpoint;
    }
    return `http://${this.instanceId}.pushnotifications.com`;
  }

  async start() {
    const { vapidPublicKey: publicKey } = await this.getPublicKey();

    // register with pushManager, get endpoint etc
    const token = await this.getPushToken(publicKey).catch(console.error);

    // get device id from errol
    const path = `/device_api/v1/instances/${this.instanceId}/devices/web`;

    const response = await this.doRequest("POST", path, { token });

    // put response.id in indexedDB
    this.deviceId = response.id;
  }

  getPublicKey() {
    const path = `${this.baseUrl}/device_api/v1/instances/${
      this.instanceId
    }/web-vapid-public-key`;
    const options = { method: "GET", path };
    return doRequest(options);
  }
}
