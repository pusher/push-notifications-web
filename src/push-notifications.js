import { WebPushClient } from './web-push-client';
import { SafariClient } from './safari-client';
import TokenProvider from './token-provider';

const RegistrationState = Object.freeze({
  PERMISSION_PROMPT_REQUIRED: 'PERMISSION_PROMPT_REQUIRED',
  PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS:
    'PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS',
  PERMISSION_GRANTED_REGISTERED_WITH_BEAMS:
    'PERMISSION_GRANTED_REGISTERED_WITH_BEAMS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
});

function Client(config) {
  if ('safari' in window) {
    return new SafariClient(config);
  }
  return new WebPushClient(config);
}

export { Client, RegistrationState, TokenProvider };
