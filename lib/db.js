var config = require('histograph-config');
var bcrypt = require('bcrypt');
var neo4j = require('neo4j');
var graphDb = new neo4j.GraphDatabase('http://' +
  config.neo4j.host + ':' + config.neo4j.port);

function send500(res, data) {
  res.status(500).send(data);
}

function send404(res, type, id) {
  res.status(404).send({
    message: type + ' \'' + id + '\' not found'
  });
}

module.exports.initAdmin = function() {
  // Create admin owner (if not exists)
  var name = config.api.admin.name;
  var password = config.api.admin.password;

  graphDb.cypher({
    query: 'MERGE (admin:Owner { name:{name} }) ON CREATE SET admin.password = {password}',
    params: {
      name: name,
      password: bcrypt.hashSync(password, 8)
    }
  }, function(err) {
    if (err) {
      console.error('Error creating admin owner');
    }
  });
};

function datasetExists(req, res, next) {
  graphDb.cypher({
    query: 'MATCH (dataset:Dataset {dataset: {id}}) RETURN dataset',
    params: {
      id: req.params.dataset
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      next();
    } else {
      send404(res, 'Dataset', req.params.dataset);
    }
  });
}

function createDataset(res, dataset, ownerName, callback) {
  var params = {
    ownerName: ownerName
  };

  var queryDataset = Object.keys(dataset).map(function(key) {
    var newKey = key;
    if (key === 'id') {
      newKey = 'dataset';
    }

    params[newKey] = dataset[key];
    return newKey + ': {' + newKey + '}';
  }).join(', ');

  graphDb.cypher({
    query: 'MATCH (owner:Owner {name: {ownerName}}) MERGE (owner)-[:OWNS]->(:Dataset {' + queryDataset + '})',
    params: params
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function updateDataset(res, dataset, callback) {
  var params = {
    id: dataset.id
  };

  var queryDataset = Object.keys(dataset).filter(function(key) {
    return key !== 'id';
  }).map(function(key) {
    params[key] = dataset[key];
    return 's.' + key + ' = {' + key + '}';
  }).join(', ');

  graphDb.cypher({
    query: 'MERGE (s:Dataset { dataset: {id} }) ON MATCH SET ' + queryDataset,
    params: params
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function deleteDataset(res, dataset, callback) {
  graphDb.cypher({
    query: 'MATCH (s:Dataset { dataset: {id}})-[r:OWNS]-() DELETE s, r',
    params: {
      id: dataset
    }
  }, function(err) {
    if (err) {
      send500(res, err.neo4j);
    } else {
      callback();
    }
  });
}

function getDataset(res, dataset, callback) {
  graphDb.cypher({
    query: 'MATCH (dataset:Dataset { dataset: {id}}) RETURN dataset',
    params: {
      id: dataset
    }
  }, function(err, results) {
    if (err) {
      send500(res, err.neo4j);
    } else if (results.length == 1) {
      var dataset = results[0].dataset.properties;
      dataset.id = dataset.dataset;
      delete dataset.dataset;
      callback(dataset);
    } else {
      callback(null);
    }
  });
}

function getDatasets(res, callback) {
  graphDb.cypher({
    query: 'MATCH (dataset:Dataset) RETURN dataset'
  }, function(err, results) {
    if (err) {
      callback(err);
    } else {
      callback(results.map(function(s) {
        var dataset = s.dataset.properties;
        dataset.id = dataset.dataset;
        delete dataset.dataset;
        return dataset;
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

function getOwnerForDataset(res, dataset, callback) {
  graphDb.cypher({
    query: 'MATCH (owner:Owner)-[:OWNS]-(:Dataset {dataset: {dataset}}) RETURN owner',
    params: {
      dataset: dataset
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

module.exports.datasetExists = datasetExists;
module.exports.createDataset = createDataset;
module.exports.updateDataset = updateDataset;
module.exports.deleteDataset = deleteDataset;
module.exports.getDataset = getDataset;
module.exports.getDatasets = getDatasets;
module.exports.getOwner = getOwner;
module.exports.getOwnerForDataset = getOwnerForDataset;
