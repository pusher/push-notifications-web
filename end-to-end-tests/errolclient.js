const request = require('request-promise-native');

class ErrolTestClient {
  constructor(instanceId) {
    this.instanceId = instanceId;
  }

  apiRequest({headers={}, method='GET', path='', body=undefined}) {
    const reqHeaders = {...headers, 'content-type': 'application/json'};
    const reqUrl = `https://${this.instanceId}.pushnotifications.pusher.com${path}`;
    const requestOptions = {
      headers,
      method,
      url: reqUrl,
      body,
      resolveWithFullResponse: true,
      simple: false,
    }
    return request(requestOptions);
  }

  deviceApiRequest({headers, method, path, body}) {
    const qualifiedPath = `/device_api/v1/instances/${this.instanceId}${path}`;
    return this.apiRequest({
      headers,
      method,
      path: qualifiedPath,
      body,
    })
  }

  async getWebDevice(deviceId) {
    return this.deviceApiRequest({
      method: 'GET',
      path: `/devices/web/${deviceId}`
    })
  }
}

module.exports = {
  ErrolTestClient,
}
