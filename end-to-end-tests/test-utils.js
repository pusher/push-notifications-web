const http = require('http');
const { spawn } = require('child_process');

const MAX_TEST_SERVER_CHECKS = 10;
const TEST_SERVER_CHECK_SLEEP_MS = 200;


export async function launchServer() {
  const testServer = spawn('node', ['./end-to-end-tests/test-app/server.js']);
  const killFunc = () => testServer.kill('SIGHUP');

  return retryLoop(
    () => httpPing('http://localhost:3000'),
    MAX_TEST_SERVER_CHECKS,
    TEST_SERVER_CHECK_SLEEP_MS,
  )
    .then(() => killFunc)
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

function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
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
