var redis = require("redis"),
    fs = require("fs"),
    config = require('../config.json'),
    client = redis.createClient(config.redis.port, config.redis.host),
    list = config.redis.list;

function add(data) {
  console.log("Pushing to queue:");
  console.log(data)
  client.rpush(list, JSON.stringify(data));
}

module.exports.add = add;
