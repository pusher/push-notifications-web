var express = require("express");
var app = express();

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/push-notifications.js", function(req, res) {
  console.log();
  res.sendFile(process.cwd() + "/dist/push-notifications.js");
});

app.get("/sw.js", function(req, res) {
  res.send("");
});

app.listen(3000);
