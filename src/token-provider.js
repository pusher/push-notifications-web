import doRequest from './doRequest';

export default class TokenProvider {
  constructor({ url, queryParams, headers } = {}) {
    this.url = url;
    this.queryParams = queryParams;
    this.headers = headers;
  }

  async fetchToken(userId) {
    let queryParams = { user_id: userId, ...this.queryParams };
    const encodedParams = Object.entries(queryParams)
      .map(kv => kv.map(encodeURIComponent).join('='))
      .join('&');
    let response = await doRequest(
      'GET',
      `${this.url}?${encodedParams}`,
      null,
      this.headers
    );
    return response;
  }
}
