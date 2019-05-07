const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const chrome = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');

const MAX_TEST_SERVER_CHECKS = 10;
const TEST_SERVER_CHECK_SLEEP_MS = 200;

const TEST_SERVER_ENTRYPOINT = './end-to-end-tests/test-app/server.js';
const TEST_SERVER_URL = 'http://localhost:3000';

const CHROME_SCREEN_SIZE = {
  width: 640,
  height: 480
};
const CHROME_CONFIG_TEMP_DIR = `${__dirname}/temp`;

/**
 * Helper for launching a test application server
 * @async
 * @return {promise<function>} - Call this function to shutdown the launched
 *                               server
 */
export async function launchServer() {
  const testServer = spawn('node', [TEST_SERVER_ENTRYPOINT]);
  const killFunc = () => testServer.kill('SIGHUP');

  return retryLoop(
    () => httpPing(TEST_SERVER_URL),
    MAX_TEST_SERVER_CHECKS,
    TEST_SERVER_CHECK_SLEEP_MS,
  )
    // If we successfully launched the test server,
    // return a function to kill it
    .then(() => killFunc) 
    // Otherwise, kill the server and raise an exception
    .catch((e) => { 
      killFunc()
      throw e;
    })
}

async function retryLoop(func, maxChecks, sleepInterval) {
  for (let i = 0; i < maxChecks; i++) {
    const result = await func();
    if (result) {
      return
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
 * @return {ChomeDriver} - Selenium webdriver instance (Chrome)
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
  // Create temp directory
  if (!fs.existsSync(CHROME_CONFIG_TEMP_DIR)){
    fs.mkdirSync(CHROME_CONFIG_TEMP_DIR);
  }

  // Create preferences directory
  const prefsDir = `${CHROME_CONFIG_TEMP_DIR}/Default`;
  if (!fs.existsSync(prefsDir)){
    fs.mkdirSync(prefsDir);
  }

  // Create preferences file
  const prefsFileName = `${prefsDir}/Preferences`;
  const configFileObject = createTempBrowserPreferences('http://localhost:8080');
  const configFileString = JSON.stringify(configFileObject);

  fs.writeFileSync(prefsFileName, configFileString);

  /**
   * Construct a new Chrome instance
   */
  const chromeOptions = new chrome.Options()
    .headless()
    .windowSize(CHROME_SCREEN_SIZE)
    .addArguments('--ignore-certificate-errors') // Allow web push over http
    .addArguments('--profile-directory=Default') // Override config
    .addArguments(`--user-data-dir=${CHROME_CONFIG_TEMP_DIR}`)
    .addArguments('--disk-cache-dir=/dev/null');  // Disable cache

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  return driver
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
            }
          }
        }
      }
    }
  }
}

function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

