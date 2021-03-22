import { WebPushClient } from './web-push-client';
import { SafariClient } from './safari-client';
import TokenProvider from './token-provider';
import { RegistrationState } from './base-client';

function Client(config) {
  if (isSafari()) {
    return new SafariClient(config);
  }
  return new WebPushClient(config);
}

function isSafari() {
  return (
    window.navigator.userAgent.indexOf('Safari') > -1 &&
    window.navigator.userAgent.indexOf('Chrome') === -1
  );
}

export { Client, RegistrationState, TokenProvider };
