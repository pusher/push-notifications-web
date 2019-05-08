import doRequest from './doRequest';

test('doRequest', () => {
    expect(typeof doRequest).toBe('function');
});

test('Handles responses with no body', () => {
    return doRequest('POST', 'http://fake-url.com').then(res =>
        expect(res).toBeNull()
    );
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
    return doRequest('GET', 'http://fake-url.com').then(res => {
        expect(res).toBeNull();
    });
});

test('Handles bad JSON', () => {
    fetch.mockResponseOnce('{"badjson": "very incorrect"');
    return doRequest('GET', 'http://fake-url.com').then(res => {
        expect(res).toBeNull();
    });
});
