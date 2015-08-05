var fs = require('fs');
var ndjson = require('ndjson');
var diff = require('diff-utility');
var current = require('./current');
var queue = require('./queue');

var types = {
  pits: 'pit',
  relations: 'relation'
};

function fileChanged(dataset, type, force, callback) {
  var filePath = current.getFilename(dataset, type);

  if (!force) {
    // force === false
    // Run diff, compare with current version of file,
    // and only send changes to queue

    var previousItem;
    var previousLine;

    diff(current.getCurrent(filePath), filePath)
      .on('diff', function(line) {
        if (line.str) {
          var item = {
            dataset: dataset,
            type: types[type],
            action: (line.type == 'in') ? 'add' : 'delete',
            data: JSON.parse(line.str)
          };

          // TODO: instead of type == pit and id == id,
          // generate key, and check for key
          // pit key: [id]
          // relation key: [from,to,label]
          if (previousItem &&
              item.type == 'pit' &&
              item.data.id == previousItem.data.id &&
              line.change == 'change' &&
              line.change == previousLine.change &&
              line.line == previousLine.line) {
            item.action = 'update';
          } else {
            if (previousItem) {
              queue.add(previousItem);
            }
          }

          previousItem = item;
          previousLine = line;
        }
      })
      .on('error', function(error) {
        console.log('Error: ' + error);
      })
      .on('end', function() {
        if (previousItem) {
          queue.add(previousItem);
        }

        current.setCurrent(filePath);
        if (callback) {
          callback();
        }
      });
  } else {
    // force === true
    // Don't run diff, but write each line
    // to the queue directly!
    fs.createReadStream(filePath)
      .pipe(ndjson.parse())
      .on('data', function(obj) {
        var item = {
          dataset: dataset,
          type: types[type],
          action: 'add',
          data: obj
        };
        queue.add(item);
      })
      .on('end', function() {
        current.setCurrent(filePath);
        if (callback) {
          callback();
        }
      });
  }
}

module.exports.fileChanged = fileChanged;
