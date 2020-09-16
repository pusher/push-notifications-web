import doRequest from './do-request';

export default class TokenProvider {
  constructor({ url, queryParams, headers, credentials } = {}) {
    this.url = url;
    this.queryParams = queryParams;
    this.headers = headers;
    this.credentials = credentials;
  }

  async fetchToken(userId) {
    let queryParams = { user_id: userId, ...this.queryParams };
    const encodedParams = Object.entries(queryParams)
      .map(kv => kv.map(encodeURIComponent).join('='))
      .join('&');
    const options = {
      method: 'GET',
      path: `${this.url}?${encodedParams}`,
      headers: this.headers,
      credentials: this.credentials,
    };
    let response = await doRequest(options);
    return response;
  }
}
