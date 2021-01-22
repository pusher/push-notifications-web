import {
  launchServer,
  createChromeWebDriver,
  NOTIFICATIONS_DEFAULT,
  NOTIFICATIONS_GRANTED,
  NOTIFICATIONS_DENIED,
  unregisterServiceWorker
} from './test-utils';
import * as PusherPushNotifications from '../src/push-notifications';

let killServer = null;
let chromeDriver = null;

beforeAll(async () => {
  killServer = await launchServer()
})

async function prepareServer(notificationPermission) {
    chromeDriver = await createChromeWebDriver(notificationPermission)
    await chromeDriver.get('http://localhost:3000');
    await chromeDriver.wait(() => {
      return chromeDriver.getTitle().then(title => title.includes('Test Page'));
    }, 2000);
}

test('.getState should return PERMISSION_GRANTED_REGISTERED_WITH_BEAMS if start has been called and permissions are granted', async () => {
  await prepareServer(NOTIFICATIONS_GRANTED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient = new PusherPushNotifications.Client({
      instanceId,
    })
    return beamsClient.start()
      .then(beamsClient => beamsClient.getRegistrationState())
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.RegistrationState.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS);
});

test('.getState should return PERMISSION_PROMPT_REQUIRED if start has not been called and permissions are default', async () => {
  await prepareServer(NOTIFICATIONS_DEFAULT)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient = new PusherPushNotifications.Client({
      instanceId,
    })
    return beamsClient.getRegistrationState()
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.RegistrationState.PERMISSION_PROMPT_REQUIRED);
});

test('.getState should return PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS if start has not been called and permissions are granted', async () => {
  await prepareServer(NOTIFICATIONS_GRANTED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient = new PusherPushNotifications.Client({
      instanceId,
    })
    return beamsClient.getRegistrationState()
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.RegistrationState.PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS);
});

test('.getState should return PERMISSION_DENIED if start has not been called and permissions are denied', async () => {
  await prepareServer(NOTIFICATIONS_DENIED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient = new PusherPushNotifications.Client({
      instanceId,
    })
    return beamsClient.getRegistrationState()
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.RegistrationState.PERMISSION_DENIED);
});

afterEach(async () => {
  if (chromeDriver) {
    await unregisterServiceWorker(chromeDriver)
    await chromeDriver.quit();
  }
})

afterAll(() => {
  if (killServer) {
    killServer();
  }
});
