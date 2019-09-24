const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const SERVICE_WORKER_PRESENT = process.env.SERVICE_WORKER_PRESENT || 'true';

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE=html>
  <html>
    <head>
      <meta charset=utf8>
      <title>Push Notifications Web - Test Page</title>
    </head>
    <body>
      <script src="push-notifications-cdn.js"></script>
    </body>
  </html>
  `);
});

app.get('/push-notifications-cdn.js', (req, res) => {
  res.sendFile(path.resolve('./dist/push-notifications-cdn.js'));
});

app.get('/service-worker.js', (req, res) => {
  if (SERVICE_WORKER_PRESENT === 'true') {
    res.set('Content-Type', 'text/javascript');
    res.send('');
  } else {
    res.status(404).send('Not found');
  }
});

// Service worker in unusual location
app.get('/not-the-root/service-worker.js', (req, res) => {
  res.set('Content-Type', 'text/javascript');
  res.send('');
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
