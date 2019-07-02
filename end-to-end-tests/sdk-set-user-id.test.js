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
    })
    .then(async () => {
      const errolClient = new ErrolTestClient(
        '1b880590-6301-4bb5-b34f-45db1c5f5644'
      );
      const response = await errolClient.deleteUser('cucas');
      expect(response.statusCode).toBe(200);
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

test('SDK should set user id with errol', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const deviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(beamsClient => beamsClient.start())
      .then(beamsClient => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(deviceId).toContain('web-');
  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    // Fake local TokenProvider that just returns a token signed for
    // the user 'cucas' with a long expiry. Since the hardcoded token
    // is signed for 'cucas' we throw an exception if another user ID
    // is requested.
    let tokenProvider = {
      fetchToken: userId => {
        if (userId !== 'cucas') {
          throw new Error(
            'Unexpected user ID ' +
              userId +
              ', this token provider is hardcoded to "cucas"'
          );
        } else {
          return {
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
          };
        }
      },
    };

    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(beamsClient => beamsClient.setUserId('cucas', tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('');

  const errolClient = new ErrolTestClient(
    '1b880590-6301-4bb5-b34f-45db1c5f5644'
  );

  const response = await errolClient.getWebDevice(deviceId);
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body).userId).toBe('cucas');
});

test('SDK should return an error if we try to reassign the user id', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const deviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(beamsClient => beamsClient.start())
      .then(beamsClient => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(deviceId).toContain('web-');

  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    let tokenProvider = {
      fetchToken: () => ({
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
      }),
    };

    let beamsClient;
    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.setUserId('cucas', tokenProvider))
      .then(() => beamsClient.setUserId('ronaldinho', tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('Changing the `userId` is not allowed.');
});

test('SDK should return an error if .start has not been called', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    let tokenProvider = {
      fetchToken: () => ({
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
      }),
    };

    let beamsClient;
    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.setUserId('cucas', tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('.start must be called before .setUserId');
});

test('SDK should return an error if user ID is empty string', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const deviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(beamsClient => beamsClient.start())
      .then(beamsClient => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(deviceId).toContain('web-');

  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    let tokenProvider = {
      fetchToken: () => ({
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
      }),
    };

    let beamsClient;
    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.setUserId('', tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('User ID cannot be the empty string');
});

test('SDK should return an error if user ID is not a string', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle().then(title => title.includes('Test Page'));
  }, 2000);

  const deviceId = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(beamsClient => beamsClient.start())
      .then(beamsClient => asyncScriptReturnCallback(beamsClient.deviceId))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(deviceId).toContain('web-');

  const setUserIdError = await chromeDriver.executeAsyncScript(() => {
    const asyncScriptReturnCallback = arguments[arguments.length - 1];

    let tokenProvider = {
      fetchToken: () => ({
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDc5OTIzMDIsImlzcyI6Imh0dHBzOi8vMWI4ODA1OTAtNjMwMS00YmI1LWIzNGYtNDVkYjFjNWY1NjQ0LnB1c2hub3RpZmljYXRpb25zLnB1c2hlci5jb20iLCJzdWIiOiJjdWNhcyJ9.CTtrDXh7vae3rSSKBKf5X0y4RQpFg7YvIlirmBQqJn4',
      }),
    };

    let beamsClient;
    return PusherPushNotifications.init({
      instanceId: '1b880590-6301-4bb5-b34f-45db1c5f5644',
    })
      .then(c => (beamsClient = c))
      .then(() => beamsClient.setUserId(undefined, tokenProvider))
      .then(() => asyncScriptReturnCallback(''))
      .catch(e => asyncScriptReturnCallback(e.message));
  });

  expect(setUserIdError).toBe('User ID must be a string (was undefined)');
});

afterAll(() => {
  if (killServer) {
    killServer();
  }
  if (chromeDriver) {
    chromeDriver.quit();
  }
});
