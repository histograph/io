var fs = require('fs'),
    watch = require('watch'),
    path = require('path'),
    diff = require('diff-utility'),
    validator = require('is-my-json-valid'),
    current = require('./current'),
    queue = require('./queue'),
    ndjsonFiles = [
      "vertices",
      "edges"
    ],
    validators = {};

ndjsonFiles.forEach(function(ndjsonFile) {
  validators[ndjsonFile] = validator(fs.readFileSync("schemas/" + ndjsonFile + ".schema.json", "utf8"))
})

watch.createMonitor('./data', {
    filter: function(f) {
      return f.indexOf(current.dirName()) == -1;
    }
  }, function (monitor) {

  monitor.on("created", fileChanged);
  monitor.on("changed", fileChanged);

  monitor.on("removed", function (f, stat) {
    console.log("Removed: " + f);
  });
});

function fileChanged(f) {
  var ext = path.extname(f),
      base = path.basename(f, ext),
      layer = "test";

  if (ext === ".ndjson" && ndjsonFiles.indexOf(base) > -1) {
    var objectType = base;
    var cancel = false;
    queue.startTransaction();
    diff(current.getCurrent(f), f)
      .on("diff", function (line) {
        if (!cancel) {
          try {
            var obj = JSON.parse(line.str);
            if (validators[objectType](obj)) {
              var action = (line.type == "in") ? "add" : "delete";
              queue.add(objectType, {
                action: action,
                data: obj
              });
            } else {
              cancel = true;
              queue.cancelTransaction();
            }
          } catch(e) {
            cancel = true;
            queue.cancelTransaction();
          }
        }
      })
      .on("error", function(error) {
        cancel = true;
        queue.cancelTransaction();
        console.log("Error: " + error);
      })
      .on("end", function() {
        if (!cancel) {
          queue.commitTransaction();
          current.setCurrent(f);
        }
      });
  }
}
