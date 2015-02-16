var fs = require('fs-extra'),
    path = require('path');

var CURRENT_DIR = "current";

// TODO: catch errors!

function getCurrent(f) {
  var dir = path.dirname(f),
      base = path.basename(f),
      currentF = dir + "/" + CURRENT_DIR + "/" + base;

  ensureDir(dir + "/" + CURRENT_DIR);
  ensureFile(currentF);

  return currentF;
}

function setCurrent(f) {
  var dir = path.dirname(f),
      base = path.basename(f),
      currentF = dir + "/" + CURRENT_DIR + "/" + base;

  ensureDir(dir + "/" + CURRENT_DIR);
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

function dirName() {
  return CURRENT_DIR;
}

module.exports.getCurrent = getCurrent;
module.exports.setCurrent = setCurrent;
module.exports.dirName = dirName;
