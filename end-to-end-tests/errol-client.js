const request = require('request-promise-native');

class ErrolTestClient {
  constructor(instanceId) {
    this.instanceId = instanceId;
  }

  apiRequest({ headers = {}, method, path = '', body }) {
    const reqUrl = `https://${
      this.instanceId
    }.pushnotifications.pusher.com${path}`;
    const requestOptions = {
      headers,
      method,
      url: reqUrl,
      body,
      resolveWithFullResponse: true,
      simple: false,
    };

    return request(requestOptions);
  }

  deviceApiRequest({ headers, method, path, body }) {
    const qualifiedPath = `/device_api/v1/instances/${this.instanceId}${path}`;
    return this.apiRequest({
      headers,
      method,
      path: qualifiedPath,
      body,
    });
  }

  customerApiRequest({ method, path, body }) {
    const qualifiedPath = `/customer_api/v1/instances/${
      this.instanceId
    }${path}`;
    return this.apiRequest({
      headers: {
        Authorization:
          'Bearer F8AC0B756E50DF235F642D6F0DC2CDE0328CD9184B3874C5E91AB2189BB722FE',
      },
      method,
      path: qualifiedPath,
      body,
    });
  }

  async getWebDevice(deviceId) {
    return this.deviceApiRequest({
      method: 'GET',
      path: `/devices/web/${deviceId}`,
    });
  }

  async deleteUser(userId) {
    return this.customerApiRequest({
      method: 'DELETE',
      path: `/users/${encodeURIComponent(userId)}`,
    });
  }
}

module.exports = {
  ErrolTestClient,
};
