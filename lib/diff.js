var diff = require('diff-utility');
var current = require('./current');
var queue = require('./queue');

var types = {
      pits: 'pit',
      relations: 'relation'
    };

function fileChanged(source, type, callback) {
  var filePath = current.getFilename(source, type).replace('/current', '');

  var previousItem;
  var previousLine;

  diff(current.getCurrent(filePath), filePath)
    .on('diff', function(line) {
      var item = {
        source: source,
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

}

module.exports.fileChanged = fileChanged;
