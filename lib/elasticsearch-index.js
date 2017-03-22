const config = require('histograph-config');

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: config.elasticsearch.host + ':' + config.elasticsearch.port
});

const defaultMapping = require('histograph-config/ESconfig')();

const log = require("histograph-logging");

const my_log = new log("io");

// my_log.debug("mapping: " + JSON.stringify(defaultMapping));

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
