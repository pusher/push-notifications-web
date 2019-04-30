export default function doRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  return fetch(path, options)
    .then(response => {
      return response.json();
    })
    .catch(console.error);
}
