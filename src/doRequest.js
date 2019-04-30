export default function doRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  return fetch(path, options)
    .then(response => response.text())
    .then(text => {
      if (text) {
        return JSON.parse(text);
      }
      return null;
    })
    .catch(err => {
      if (err.message.toLowerCase().includes('unexpected')) {
        console.warn('Response body in unexpected format.');
        return null;
      } else {
        throw err;
      }
    });
}
