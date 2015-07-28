var redis = require('redis');
var config = require(process.env.HISTOGRAPH_CONFIG);
var client = redis.createClient(config.redis.port, config.redis.host);
var coreQueue = config.redis.queues.histograph;

function add(data) {
  var key;
  if (data.type === 'pit') {
    key = data.datasetid + '/' + (data.data.id || data.data.uri);
  } else if (data.type === 'relation') {
    key = data.data.from + ' - ' + data.data.to;
  }

  console.log('Pushing \'' + data.type + '.' + data.action + '\' to queue: \'' + key + '\'');
  client.rpush(coreQueue, JSON.stringify(data));
}

module.exports.add = add;
