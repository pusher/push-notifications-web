export default function doRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  return fetch(path, options).then(async response => {
    if (!response.ok) {
      handleError(response);
    }

    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  });
}

async function handleError(response) {
  let errorMessage;
  try {
    const {
      error = 'Unknown error',
      description = 'No description',
    } = await response.json();
    errorMessage = `Unexpected status code ${
      response.status
    }: ${error}, ${description}`;
  } catch (_) {
    errorMessage = `Unexpected status code ${
      response.status
    }: Cannot parse error response`;
  }

  throw new Error(errorMessage);
}
