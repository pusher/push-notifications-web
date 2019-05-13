import { ErrolTestClient } from './errolclient';
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

test('SDK should set user id with errol', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const initialDeviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';
    let beamsClient;

    return PusherPushNotifications.init({ instanceId })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.start())
      .then(() => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(initialDeviceId).toContain('web-');

  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    let tokenProvider = {
      fetchToken: function() {
        return {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
        };
      },
    };

    const instanceId = '1b880590-6301-4bb5-b34f-45db1c5f5644';
    let beamsClient;
    return PusherPushNotifications.init({ instanceId })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.setUserId('cucas', tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('');

  const errolClient = new ErrolTestClient(
    '1b880590-6301-4bb5-b34f-45db1c5f5644'
  );

  const response = await errolClient.getWebDevice(initialDeviceId);
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body).userId).toBe('cucas');
});

afterAll(() => {
  if (killServer) {
    killServer();
  }
  if (chromeDriver) {
    chromeDriver.quit();
  }
});
