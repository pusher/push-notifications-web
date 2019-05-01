const express = require('express')
const path = require('path');
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE=html>
  <html>
    <head>
      <meta charset=utf8>
      <title>Push Notifications Web - Test Page</title>
    </head>
    <body>
      <script src="push-notifications.js"></script>
    </body>
  </html>
  `)
})

app.get('/push-notifications.js', (req, res) => {
  res.sendFile(path.resolve('./dist/push-notifications.js'));
})

app.get('/sw.js', (req, res) => {
  res.set('Content-Type', 'text/javascript');
  res.send('');
})

app.listen(port, () => console.log(`Listening on port ${port}...`))
