var fs = require('fs-extra');
var path = require('path');
var config = require('histograph-config');
var datasetsDir = path.join(config.api.dataDir, 'datasets');
var currentDir = 'current';

function getDir(dataset) {
  return path.join(datasetsDir, dataset);
}

function createDir(dataset) {
  var dir = getDir(dataset);
  fs.removeSync(dir);
  ensureDir(dir);
}

function getCurrentFilename(dataset, type) {
  return path.join(getDir(dataset), currentDir, type + '.ndjson');
}

function getFilename(dataset, type) {
  return path.join(getDir(dataset), type + '.ndjson');
}

function getCurrent(f) {
  var dir = path.dirname(f);
  var base = path.basename(f);
  var currentF = dir + '/' + currentDir + '/' + base;

  ensureDir(dir + '/' + currentDir);
  ensureFile(currentF);

  return currentF;
}

function setCurrent(f) {
  var dir = path.dirname(f);
  var base = path.basename(f);
  var currentF = dir + '/' + currentDir + '/' + base;

  ensureDir(dir + '/' + currentDir);
  fs.copySync(f, currentF);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    fs.closeSync(fs.openSync(file, 'w'));
  }
}

module.exports.createDir = createDir;
module.exports.getFilename = getFilename;
module.exports.getCurrentFilename = getCurrentFilename;

module.exports.getCurrent = getCurrent;
module.exports.setCurrent = setCurrent;
