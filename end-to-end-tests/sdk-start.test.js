import { launchServer, createChromeWebDriver } from './test-utils';

let killServer = null;
let chromeDriver = null;

beforeAll(() => {
  const serverProm = launchServer()
    .then(killFunc => {
      killServer = killFunc;
    })
  const driverProm = createChromeWebDriver()
    .then(driver => {
      chromeDriver = driver;
    });

  return Promise.all([serverProm, driverProm]);
});


test('Example test - page title', async () => {
  await chromeDriver.get('http://localhost:3000');
  await chromeDriver.wait(() => {
    return chromeDriver.getTitle()
      .then(title => title.includes('Test Page'))
  }, 2000);

  const result = await chromeDriver.executeScript(() => {
    return document.title;
  });

  expect(result).toBe('Push Notifications Web - Test Page');
});


afterAll(() => {
  if (killServer) {
    killServer();
  }
});

