var redis = require("redis"),
    fs = require("fs"),
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8')),
    client = redis.createClient(config.redis.port, config.redis.host),
    list = config.redis.list;

function add(data) {
  console.log("Pushing to queue:");
  console.log(data)
  client.lpush(list, JSON.stringify(data));
}

module.exports.add = add;
