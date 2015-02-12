// var redis = require("redis"),
//     client = redis.createClient(),
//     multi;

// support creating new queues, and multiple transactions!

function add(data) {
  // multi.lpush(type, JSON.stringify(data));
  console.log(data)
}

function startTransaction() {
  // multi = client.multi();
}

function commitTransaction() {
  // multi.exec(function (err, replies) {
  //   console.log(replies);
  // });
}

module.exports.add = add;
module.exports.startTransaction = startTransaction;
module.exports.cancelTransaction = startTransaction;
module.exports.commitTransaction = commitTransaction;
