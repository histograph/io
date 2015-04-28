var fs = require('fs-extra');
var path = require('path');
var config = require(process.env.HISTOGRAPH_CONFIG);
var sourcesDir = path.join(config.api.dataDir, 'sources');
var currentDir = 'current';

function getDir(source) {
  return path.join(sourcesDir, source);
}

function createDir(source) {
  var dir = getDir(source);
  fs.removeSync(dir);
  ensureDir(dir);
}

function getCurrentFilename(source, type) {
  return path.join(getDir(source), currentDir, type + '.ndjson');
}

function getFilename(source, type) {
  return path.join(getDir(source), type + '.ndjson');
}


// TODO: catch errors!

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
