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

  if (!(function (x) { for (let i in x) return false; return true })(params)) { // check for empty params obj
    path += Object.entries(params)
              .filter(x => x[1])
              .reduce((prev, cur) => prev + (prev !== "?" ? "&" : "") + cur.map(x => encodeURIComponent(x))
                .join("="), "?");
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
