var bcrypt = require('bcrypt');
var basicAuth = require('basic-auth');
var db = require('./db');

// Init admin owner
db.initAdmin();

function send401(res) {
  res.status(401).send({
    message: 'Authorization required'
  });
}

function checkOwner(req, owner) {
  var user = basicAuth(req);
  return user && owner.name == user.name && bcrypt.compareSync(user.pass, owner.password);
}

function owner(req, res, next) {
  var user = basicAuth(req);
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

function ownerForSource(req, res, next) {
  db.getOwnerForSource(res, req.params.source, function(owner) {
    if (owner && checkOwner(req, owner)) {
      next();
    } else {
      send401(res);
    }
  });
}

module.exports.owner = owner;
module.exports.ownerForSource = ownerForSource;
