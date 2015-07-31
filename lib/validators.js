var fs = require('fs');
var config = require('histograph-config');
var schemas = require('histograph-schemas');
var validator = require('is-my-json-valid');

var validators = {
  dataset: validator(schemas.dataset),
  pits: validator(schemas.pits),
  relations: validator(schemas.relations)
};

module.exports = validators;
