const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const chrome = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');

const SCRIPT_TIMEOUT_MS = 60000;

const MAX_TEST_SERVER_CHECKS = 10;
const TEST_SERVER_CHECK_SLEEP_MS = 200;

const TEST_SERVER_ENTRYPOINT = './end-to-end-tests/test-app/server.js';
const TEST_SERVER_URL = 'http://localhost';

const CHROME_SCREEN_SIZE = {
  width: 640,
  height: 480,
};
const CHROME_CONFIG_TEMP_DIR = `${__dirname}/temp`;

beforeAll(() => {
  jest.setTimeout(SCRIPT_TIMEOUT_MS);
});

/**
 * Helper for launching a test application server
 * @async
 * @return {Promise<function>} - Call this function to shutdown the launched
 *                               server
 */
export async function launchServer(config = {}) {
  const { port = 3000, serviceWorkerPresent = 'true' } = config;

  const testServer = spawn('node', [TEST_SERVER_ENTRYPOINT], {
    env: {
      ...process.env,
      PORT: port,
      SERVICE_WORKER_PRESENT: serviceWorkerPresent,
    },
  });
  const killFunc = () => testServer.kill('SIGHUP');

  return (
    retryLoop(
      () => httpPing(`${TEST_SERVER_URL}:${port}`),
      MAX_TEST_SERVER_CHECKS,
      TEST_SERVER_CHECK_SLEEP_MS
    )
      // If we successfully launched the test server,
      // return a function to kill it
      .then(() => killFunc)
      // Otherwise, kill the server and raise an exception
      .catch(e => {
        killFunc();
        throw e;
      })
  );
}

async function retryLoop(func, maxChecks, sleepInterval) {
  for (let i = 0; i < maxChecks; i++) {
    const result = await func();
    if (result) {
      return;
    }

    await sleep(sleepInterval);
  }

  throw new Error('Max retries exceeded');
}

function httpPing(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      if (res.statusCode <= 299) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => resolve(false));
  });
}

/**
 * Helper for instantiating a new Selenium webdriver instance (Chrome only)
 * @async
 * @return {ChromeDriver} - Selenium webdriver instance (Chrome)
 */
export async function createChromeWebDriver() {
  // This is tricky for a few reasons:
  //  1. Selenium cannot accept the Web Push permission, so we have to
  //     create a custom config file to do this in advance.
  //  2. Chrome requires service workers / Web Push applications to be served
  //     over HTTPS. This has to be disabled.
  //  3. Chrome caches pages by default, which can be a pain when updating
  //     tests. This also has to be disabled.

  /**
   * Create a config file that has already accepted web push for localhost
   */

  // Delete temp dir if it exists
  if (fs.existsSync(CHROME_CONFIG_TEMP_DIR)) {
    rimraf(CHROME_CONFIG_TEMP_DIR);
  }

  // (Re)create temp directory
  fs.mkdirSync(CHROME_CONFIG_TEMP_DIR);

  // Create preferences directory
  const prefsDir = `${CHROME_CONFIG_TEMP_DIR}/Default`;
  if (!fs.existsSync(prefsDir)) {
    fs.mkdirSync(prefsDir);
  }

  // Create preferences file
  const prefsFileName = `${prefsDir}/Preferences`;
  const configFileObject = createTempBrowserPreferences(TEST_SERVER_URL);
  const configFileString = JSON.stringify(configFileObject);

  fs.writeFileSync(prefsFileName, configFileString);

  /**
   * Construct a new Chrome instance
   */
  const chromeOptions = new chrome.Options()
    .windowSize(CHROME_SCREEN_SIZE)
    // .headless() -- Cannot run in headless mode, this breaks web push
    .addArguments('--ignore-certificate-errors') // Allow web push over http
    .addArguments('--profile-directory=Default') // Override config
    .addArguments(`--user-data-dir=${CHROME_CONFIG_TEMP_DIR}`)
    .addArguments('--disk-cache-dir=/dev/null'); // Disable cache

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  await driver.manage().setTimeouts({ script: SCRIPT_TIMEOUT_MS });

  return driver;
}

function createTempBrowserPreferences(testSiteURL) {
  const testSiteKey = `${testSiteURL},*`;
  return {
    profile: {
      content_settings: {
        exceptions: {
          notifications: {
            [testSiteKey]: {
              setting: 1,
            },
          },
        },
      },
    },
  };
}

function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Remove directory recursively
 * @param {string} dir_path
 * @see https://stackoverflow.com/a/42505874/3027390
 */
function rimraf(dir_path) {
  if (fs.existsSync(dir_path)) {
    fs.readdirSync(dir_path).forEach(function(entry) {
      var entry_path = path.join(dir_path, entry);
      if (fs.lstatSync(entry_path).isDirectory()) {
        rimraf(entry_path);
      } else {
        fs.unlinkSync(entry_path);
      }
    });
    fs.rmdirSync(dir_path);
  }
}
