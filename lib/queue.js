const redis = require('redis');
const config = require('histograph-config');
const client = redis.createClient(config.redis.port, config.redis.host);
const coreQueue = config.redis.queue;

const log = require("histograph-logging");

const my_log = new log("io");

// ensure we don't grow redis queue too much
// will only call `doneCallback` when queue size < config.redis.maxQueueSize
var waitDone = function(pollDelayMs, doneCallback)
{
  setTimeout(function() {
    // get the queue size from redis
    client.llen(coreQueue, function(err, qsize)
    {
      // there is space, report done right away
      if (qsize < config.redis.maxQueueSize)
        doneCallback(qsize);
      else
        waitDone(pollDelayMs, doneCallback); // try again in due time
    });
  }, pollDelayMs);
};

// done callback is called when queue is empty enough
function add(data, done) {
  var key;
  if (data.type === 'pit') {
    key = data.data.uri || (data.dataset + '/' + data.data.id);
  } else if (data.type === 'relation') {
    key = data.data.from + ' - ' + data.data.to;
  }

  my_log.debug('Pushing \'' + data.type + '.' + data.action + '\' to queue: \'' + key + '\'');

  // push it onto the queue, but wait with "done" until there is space
  client.lpush(coreQueue, JSON.stringify(data), function(err, qsize) {

    // no callback, no bother
    if (!done)
      return;

    // check again in 3 seconds, and keep checking, until queue has space
    if (qsize >= config.redis.maxQueueSize)
      waitDone(3000, done);
    else
      done(qsize);
  });
}

module.exports.add = add;
