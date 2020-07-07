import { launchServer, createChromeWebDriver, NOTIFICATIONS_DEFAULT, NOTIFICATIONS_GRANTED, NOTIFICATIONS_BLOCKED } from './test-utils';
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

test('.getState should return READY_FOR_NOTIFICATIONS if start has been called and permissions are granted', async () => {
  await prepareServer(NOTIFICATIONS_GRANTED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    return PusherPushNotifications.init({ instanceId })
      .then(beamsClient => beamsClient.start())
      .then(beamsClient => beamsClient.getState())
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.STATE.READY_FOR_NOTIFICATIONS);
});

test('.getState should return NOT_STARTED_NEEDS_PERMISSION if start has not been called and permissions are default', async () => {
  await prepareServer(NOTIFICATIONS_DEFAULT)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    return PusherPushNotifications.init({ instanceId })
      .then(beamsClient => beamsClient.getState())
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.STATE.NOT_STARTED_NEEDS_PERMISSION);
});

test('.getState should return NOT_STARTED_HAS_PERMISSION if start has not been called and permissions are granted', async () => {
  await prepareServer(NOTIFICATIONS_GRANTED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    return PusherPushNotifications.init({ instanceId })
      .then(beamsClient => beamsClient.getState())
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.STATE.NOT_STARTED_HAS_PERMISSION);
});

test('.getState should return BLOCKED if start has not been called and permissions are blocked', async () => {
  await prepareServer(NOTIFICATIONS_BLOCKED)

  const state = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];
    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    return PusherPushNotifications.init({ instanceId })
      .then(beamsClient => beamsClient.getState())
      .then(state => asyncScriptReturnCallback(state))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(state).toBe(PusherPushNotifications.STATE.BLOCKED);
});

afterEach(async () => {
  if (chromeDriver) {
    await chromeDriver.quit();
  }
})
  
afterAll(() => {
  if (killServer) {
    killServer();
  }
});
