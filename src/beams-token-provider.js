import doRequest from './do-request';

export default class BeamsTokenProvider {
  constructor({ url, getAuthData } = {}) {
    this.url = url;
    this.getAuthData = getAuthData;
  }

  async fetchToken(userId) {
    let userHeaders = [];
    let userQueryParams = [];
    if (this.getAuthData) {
      let authData = this.getAuthData();
      userHeaders = authData.headers;
      userQueryParams = authData.queryParams;
    }
    let queryParams = { user_id: userId, ...userQueryParams };
    const encodedParams = Object.entries(queryParams)
      .map(kv => kv.map(encodeURIComponent).join('='))
      .join('&');
    const options = {
      method: 'GET',
      path: `${this.url}?${encodedParams}`,
      headers: userHeaders,
    };
    let response = await doRequest(options);
    return response;
  }
}
