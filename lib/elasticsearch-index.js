var config = require('histograph-config');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: config.elasticsearch.host + ':' + config.elasticsearch.port
});

var defaultMapping = require('./default-mapping.json');

function formatError(err, resp, respcode) {
  if (err) {
    return {
      source: 'Elasticsearch',
      message: err.message,
      code: respcode
    };
  } else {
    return;
  }
}

module.exports.create = function(index, callback) {
  client.indices.create({
    index: index,
    body: defaultMapping
  }, function(err, resp, respcode) {
    if (callback) {
      callback(formatError(err, resp, respcode));
    }
  });
};

module.exports.delete = function(index, callback) {
  client.indices.delete({
    index: index
  }, function(err, resp, respcode) {
    if (callback) {
      callback(formatError(err, resp, respcode));
    }
  });
};
