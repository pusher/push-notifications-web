import doRequest from './do-request';

test('doRequest', () => {
  expect(typeof doRequest).toBe('function');
});

test('Handles URL with params', () => {
  const options = {
    method: 'GET',
    path: 'http://fake-url.com',
    params: { search: 'test string' },
  };
  return doRequest(options).then(() =>
    expect(fetch.mock.calls[0][0]).toEqual(
      'http://fake-url.com?search=test%20string'
    )
  );
});

test('Handles URL with multiple params', () => {
  const options = {
    method: 'GET',
    path: 'http://fake-url.com',
    params: { search: 'test string', other: 123 },
  };
  return doRequest(options).then(() =>
    expect(fetch.mock.calls[1][0]).toEqual(
      'http://fake-url.com?search=test%20string&other=123'
    )
  );
});

test('Handles responses with no body', () => {
  const options = { method: 'POST', path: 'http://fake-url.com' };
  return doRequest(options).then(res => expect(res).toBeNull());
});

test('Handles HTML response body', () => {
  fetch.mockResponseOnce(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
</head>
<body></body>
</html>`);
  const options = { method: 'GET', path: 'http://fake-url.com' };
  return doRequest(options).then(res => {
    expect(res).toBeNull();
  });
});

test('Handles bad JSON', () => {
  fetch.mockResponseOnce('{"badjson": "very incorrect"');
  const options = { method: 'GET', path: 'http://fake-url.com' };
  return doRequest(options).then(res => {
    expect(res).toBeNull();
  });
});
