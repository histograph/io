var bcrypt = require('bcrypt');
var basicAuth = require('basic-auth');
var db = require('./db');

const log = require('histograph-logging');

const my_log = new log("api");

// Init admin owner
db.initAdmin();

function send401(res) {
  res.status(401).send({
    message: 'Authorization required'
  });
}

function checkOwner(req, owner) {
  var user = basicAuth(req);
  my_log.debug("Retrieved user with name: " + owner.name + ", user hashed password: " + owner.password);
  return user && owner.name == user.name && bcrypt.compareSync(user.pass, owner.password);
}

function owner(req, res, next) {
  var user = basicAuth(req);
  my_log.debug("User to authorise: " + user);
  if (user) {
    db.getOwner(res, user.name, function(owner) {
      if (owner && checkOwner(req, owner)) {
        next();
      } else {
        send401(res);
      }
    });
  } else {
    return send401(res);
  }
}

function ownerForDataset(req, res, next) {
  db.getOwnerForDataset(res, req.params.dataset, function(owner) {
    my_log.debug("Owner for dataset: " + owner.name);
    if (owner && checkOwner(req, owner)) {
      next();
    } else {
      my_log.debug("No match for the owner");
      send401(res);
    }
  });
}

module.exports.owner = owner;
module.exports.ownerForDataset = ownerForDataset;
