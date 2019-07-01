import { ErrolTestClient } from './errol-client';
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

beforeEach(() => {
  return (async () => {
    await chromeDriver.get('http://localhost:3000');
    await chromeDriver.wait(() => {
      return chromeDriver.getTitle().then(title => title.includes('Test Page'));
    }, 2000);

    return chromeDriver.executeAsyncScript(() => {
      const asyncScriptReturnCallback = arguments[arguments.length - 1];

      let deleteDbRequest = window.indexedDB.deleteDatabase(
        'beams-1b880590-6301-4bb5-b34f-45db1c5f5644'
      );
      deleteDbRequest.onsuccess = asyncScriptReturnCallback;
      deleteDbRequest.onerror = asyncScriptReturnCallback;
    });
  })();
});

test('Calling .stop should clear SDK state', async () => {
  const errolClient = new ErrolTestClient(
    '1b880590-6301-4bb5-b34f-45db1c5f5644'
  );

  // Load test application
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  // Register a new device
  const deviceIdBeforeStop = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';

    return PusherPushNotifications.init({ instanceId })
      .then(c => (window.beamsClient = c))
      .then(() => window.beamsClient.start())
      .then(() => asyncScriptReturnCallback(window.beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  // Assert that a device has been registered
  expect(deviceIdBeforeStop).toContain('web-');

  // Call .stop
  const stopError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return window.beamsClient
      .stop()
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });
  expect(stopError).toBe('');

  // Reload the page
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const deviceIdAfterStop = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';

    return PusherPushNotifications.init({ instanceId })
      .then(c => (window.beamsClient = c))
      .then(() => asyncScriptReturnCallback(window.beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  // Assert that the SDK no longer has a device ID
  expect(deviceIdAfterStop).toBe(null);

  // Assert that the device no longer exists on the server
  const response = await errolClient.getWebDevice(deviceIdBeforeStop);
  expect(response.statusCode).toBe(404);
});

test('Calling .stop before .start should do nothing', async () => {
  const errolClient = new ErrolTestClient(
    '1b880590-6301-4bb5-b34f-45db1c5f5644'
  );

  // Load test application
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  // Call .stop
  const stopError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';

    return PusherPushNotifications.init({ instanceId })
      .then(beamsClient => beamsClient.stop())
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });
  expect(stopError).toBe('');
});

test('Calling .clearAllState should clear SDK state and create a new device', async () => {
  const errolClient = new ErrolTestClient(
    '1b880590-6301-4bb5-b34f-45db1c5f5644'
  );

  // Load test application
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  // Register a new device
  const deviceIdBeforeClear = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';

    return PusherPushNotifications.init({ instanceId })
      .then(c => (window.beamsClient = c))
      .then(() => window.beamsClient.start())
      .then(() => asyncScriptReturnCallback(window.beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  // Assert that a device has been registered
  expect(deviceIdBeforeClear).toContain('web-');

  // Call .clearAllState
  const deviceIdAfterClear = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return window.beamsClient
      .clearAllState()
      .then(() => asyncScriptReturnCallback(window.beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  // Assert that the SDK has a device ID
  expect(deviceIdAfterClear).toContain('web-');
  // Assert that the device ID has changed
  expect(deviceIdAfterClear).not.toBe(deviceIdBeforeClear);
});

afterAll(() => {
  if (killServer) {
    killServer();
  }
  if (chromeDriver) {
    chromeDriver.quit();
  }
});
