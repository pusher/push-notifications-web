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

