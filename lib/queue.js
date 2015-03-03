var redis = require("redis"),
    fs = require("fs"),
    config = require(process.env.HISTOGRAPH_CONFIG),
    client = redis.createClient(config.redis.port, config.redis.host),
    coreQueue = config.redis.queues.core;

function add(data) {
  var key;
  if (data.type === "pit") {
    key = data.layer + "/" + data.data.id;
  } else if (data.type === "relation") {
    key = data.data.from + " - " + data.data.to;
  }
  console.log("Pushing " + data.type + " to queue: \"" + key + "\"");
  client.rpush(coreQueue, JSON.stringify(data));
}

module.exports.add = add;
