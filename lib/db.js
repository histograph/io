var config = require(process.env.HISTOGRAPH_CONFIG);
var neo4j = require('neo4j');
var graphDb = new neo4j.GraphDatabase('http://' + config.core.neo4j.host + ':' + config.core.neo4j.port);

function send500(res, data) {
  res.status(500).send(data);
}

function send404(res, type, id) {
  res.status(404).send({
    message: type + ' \'' + id + '\' not found'
  });
}

function sourceExists(req, res, next) {
  graphDb.cypher({
    query: 'MATCH (source:Source {sourceid: {id}}) RETURN source',
    params: {
      id: req.params.source
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      next();
    } else {
      send404(res, 'Source', req.params.source);
    }
  });
}

function createSource(res, source, ownerName, callback) {
  var params = {
    ownerName: ownerName
  };

  var querySource = Object.keys(source).map(function(key) {
    var newKey = key;
    if (key === 'id') {
      newKey = 'sourceid';
    }

    params[newKey] = source[key];
    return newKey + ': {' + newKey + '}';
  }).join(', ');

  graphDb.cypher({
    query: 'MATCH (owner:Owner {name: {ownerName}}) MERGE (owner)-[:OWNS]->(:Source {' + querySource + '})',
    params: params
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function updateSource(res, source, callback) {
  var params = {
    id: source.id
  };

  var querySource = Object.keys(source).filter(function(key) {
    return key !== 'id';
  }).map(function(key) {
    params[key] = source[key];
    return 's.' + key + ' = {' + key + '}';
  }).join(', ');

  graphDb.cypher({
    query: 'MERGE (s:Source { sourceid: {id} }) ON MATCH SET ' + querySource,
    params: params
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function deleteSource(res, sourceId, callback) {
  graphDb.cypher({
    query: 'MATCH (s:Source { sourceid: {id}})-[r:OWNS]-() DELETE s, r',
    params: {
      id: sourceId
    }
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function getSource(res, source, callback) {
  graphDb.cypher({
    query: 'MATCH (source:Source { sourceid: {id}}) RETURN source',
    params: {
      id: source
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      var source = results[0].source.properties;
      source.id = source.sourceid;
      delete source.sourceid;
      callback(source);
    } else {
      callback(null);
    }
  });
}

function getSources(res, callback) {
  graphDb.cypher({
    query: 'MATCH (source:Source) RETURN source'
  }, function(err, results) {
    if (err) {
      callback(err);
    } else {
      callback(results.map(function(s) {
        var source = s.source.properties;
        source.id = source.sourceid;
        delete source.sourceid;
        return source;
      }));
    }
  });
}

function getOwner(res, name, callback) {
  graphDb.cypher({
    query: 'MATCH (owner:Owner {name: {name}}) RETURN owner',
    params: {
      name: name
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      callback(results[0].owner.properties);
    } else {
      // Do not return 404 when owner is not found,
      // auth module should return unautherized error instead
      callback(null);
    }
  });
}

function getOwnerForSource(res, source, callback) {
  graphDb.cypher({
    query: 'MATCH (owner:Owner)-[:OWNS]-(:Source {sourceid: {source}}) RETURN owner',
    params: {
      source: source
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      callback(results[0].owner.properties);
    } else {
      callback(null);
    }
  });
}

module.exports.sourceExists = sourceExists;
module.exports.createSource = createSource;
module.exports.updateSource = updateSource;
module.exports.deleteSource = deleteSource;
module.exports.getSource = getSource;
module.exports.getSources = getSources;
module.exports.getOwner = getOwner;
module.exports.getOwnerForSource = getOwnerForSource;
