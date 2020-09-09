import { expectType } from 'tsd';

import * as PusherPushNotifications from '.';

// Create a client
const beamsClient = new PusherPushNotifications.Client({
  instanceId: 'YOUR_INSTANCE_ID',
});

// Lifecycle management
expectType<Promise<undefined>>(beamsClient.start());
expectType<Promise<undefined>>(beamsClient.stop());
expectType<Promise<undefined>>(beamsClient.clearAllState());
expectType<Promise<string>>(beamsClient.getDeviceId());

// Interest management
expectType<Promise<undefined>>(beamsClient.addDeviceInterest('hello'));
expectType<Promise<undefined>>(beamsClient.removeDeviceInterest('hello'));
expectType<Promise<Array<string>>>(beamsClient.getDeviceInterests());
expectType<Promise<undefined>>(beamsClient.setDeviceInterests(['a', 'b', 'c']));
expectType<Promise<undefined>>(beamsClient.clearDeviceInterests());

// Authenticated Users
const tokenProvider = new PusherPushNotifications.TokenProvider({
  url: 'YOUR_BEAMS_AUTH_URL_HERE',
  queryParams: { someQueryParam: 'parameter-content' },
  headers: { someHeader: 'header-content' },
});

expectType<Promise<string>>(beamsClient.getUserId());
expectType<Promise<undefined>>(beamsClient.setUserId('alice', tokenProvider));

// Registration state
expectType<Promise<PusherPushNotifications.RegistrationState>>(
  beamsClient.getRegistrationState()
);
