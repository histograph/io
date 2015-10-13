var redis = require('redis');
var config = require('histograph-config');
var client = redis.createClient(config.redis.port, config.redis.host);
var coreQueue = config.redis.queue;

// ensure we don't grow redis queue too much
// will only do_thing when queue < config.redis.maxQueueSize
function is_ready(do_thing)
{
  // try it again in three seconds
  var try_later = function() {
    setTimeout(function(){ is_ready(do_thing); }, 3000)
  };

  // check queue, if too big, wait...
  var qsize = client.llen(coreQueue, function(err, qsize){
    if(qsize > config.redis.maxQueueSize)
      try_later();
    else
      do_thing();
  });
}

// done callback is called when queue is empty enough
function add(data, done) {
  var key;
  if (data.type === 'pit') {
    key = data.data.uri || (data.dataset + '/' + data.data.id);
  } else if (data.type === 'relation') {
    key = data.data.from + ' - ' + data.data.to;
  }

  is_ready(function(){
    console.log('Pushing \'' + data.type + '.' + data.action + '\' to queue: \'' + key + '\'');
    var qsize = client.lpush(coreQueue, JSON.stringify(data), function(err, qsize){
      // report back that we are done
      if(done)
        done(qsize);
    });
  });
}

module.exports.add = add;
