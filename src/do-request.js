export default function doRequest({
  method,
  path,
  params = {},
  body = null,
  headers = {},
  credentials = 'same-origin',
}) {
  const options = {
    method,
    headers,
    credentials,
  };

  if (!emptyParams(params)) {
    // check for empty params obj
    path += '?';
    path += Object.entries(params)
      .filter(x => x[1])
      .map(pair => pair.map(x => encodeURIComponent(x)).join('='))
      .join('&');
  }

  if (body !== null) {
    options.body = JSON.stringify(body);
    options.headers = { 'Content-Type': 'application/json', ...headers };
  }

  return fetch(path, options).then(async response => {
    if (!response.ok) {
      await handleError(response);
    }

    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  });
}

function emptyParams(params) {
  for (let i in params) return false;
  return true;
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
