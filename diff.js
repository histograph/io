var fs = require('fs'),
    path = require('path'),
    diff = require('diff-utility'),
    current = require('./current'),
    queue = require('./queue'),
    types = {
      pits: "pit",
      relations: "relation"
    };

function fileChanged(layer, file) {
  var filePath = "./data/" + layer + "/" + file;

  var ext = path.extname(filePath),
      type = path.basename(filePath, ext);

  if (ext === ".ndjson") {
    var previousItem,
        previousLine;

    // queue.startTransaction();
    diff(current.getCurrent(filePath), filePath)
      .on("diff", function (line) {
        var item = {
          layer: layer,
          type: types[type],
          action: (line.type == "in") ? "add" : "delete",
          data: JSON.parse(line.str)
        };

        // TODO: instead of type == pit and id == id,
        // generate key, and check for key
        // pit key: [id]
        // relation key: [from,to,label]
        if (previousItem &&
            item.type == "pit" &&
            item.data.id == previousItem.data.id &&
            line.change == 'change' &&
            line.change == previousLine.change &&
            line.line == previousLine.line) {
          item.action = "update";
        } else {
          if (previousItem) {
            queue.add(previousItem);
          }
        }

        previousItem = item;
        previousLine = line;
      })
      .on("error", function(error) {
        queue.cancelTransaction();
        console.log("Error: " + error);
      })
      .on("end", function() {
        if (previousItem) {
          queue.add(previousItem);
        }

        queue.commitTransaction();
        current.setCurrent(filePath);
      });
  }
}

module.exports.fileChanged = fileChanged;