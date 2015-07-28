var express = require('express');
var app = express();
var config = require(process.env.HISTOGRAPH_CONFIG);
var io = require('./index');

app.use('/', io);

app.listen(config.api.internalPort, function() {
  console.log(config.logo.join('\n'));
  console.log('Histograph IO listening at port ' + config.api.internalPort);
});
