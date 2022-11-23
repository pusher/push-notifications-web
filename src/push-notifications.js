import { WebPushClient } from './web-push-client';
import { SafariClient } from './safari-client';
import TokenProvider from './token-provider';
import { RegistrationState } from './base-client';

function Client(config) {
  if ('safari' in window) {
    return new SafariClient(config);
  }
  return new WebPushClient(config);
}

export { Client, RegistrationState, TokenProvider };
