import { launchServer, createChromeWebDriver } from './test-utils';

let killServer = null;
let chromeDriver = null;

beforeAll(() => {
  return launchServer()
    .then(killFunc => {
      killServer = killFunc;
    })
    .then(() => createChromeWebDriver())
    .then(driver => {
      chromeDriver = driver;
    });
});

test('SDK should register a device with errol', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const initialDeviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient;
    return PusherPushNotifications.init({ instanceId })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.start())
      .then(() => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(initialDeviceId).toContain('web-');
});

test('SDK should remember the device ID', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const initialDeviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient;
    return PusherPushNotifications.init({ instanceId })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.start())
      .then(() => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const reloadedDeviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = 'deadc0de-2ce6-46e3-ad9a-5c02d0ab119b';
    let beamsClient;
    return PusherPushNotifications.init({ instanceId })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.start())
      .then(() => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(reloadedDeviceId).toBe(initialDeviceId);
});

afterAll(() => {
  if (killServer) {
    killServer();
  }
  if (chromeDriver) {
    chromeDriver.quit();
  }
});
