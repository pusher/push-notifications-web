import { launchServer } from './test-utils';

let killServer;

beforeAll(() => {
  return launchServer()
    .then(killFunc => {
      killServer = killFunc;
    })
});

test('with server', () => {

});

afterAll(() => {
  if (killServer) {
    killServer();
  }
});

