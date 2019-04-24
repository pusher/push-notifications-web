export default function doRequest({ path, method, body, headers }) {
  const options = { method, body: JSON.stringify(body), headers };
  return fetch(path, options)
    .then(response => {
      return response.json();
    })
    .then(myJson => {
      console.log(JSON.stringify(myJson));
    })
    .catch(console.error);
}
