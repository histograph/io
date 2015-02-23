var fs = require('fs'),
    config = require('./config.json'),
    path = require('path'),
    async = require('async'),
    layersDir = './layers',
    files = [
      'pits',
      'relations'
    ];

console.log("Removind layer data...")

fs.readdir(layersDir, function(err, directories){
  directories.forEach(function (dir) {
    if (dir != '.') {
      fs.stat(layersDir + "/" + dir, function (err, stat) {
        if (stat.isDirectory()) {
          var layer = dir;
          console.log("  " + layer + "/*.ndjson")
          files.forEach(function(file) {
            var filepath = layersDir + "/" + layer + "/" + file + ".ndjson";
            var filepathCurrent = layersDir + "/" + layer + "/current/" + file + ".ndjson";

            try {
              fs.unlinkSync(filepath);
            } catch (err) {
              // File does not exist. That's ok!
            }

            try {
              fs.unlinkSync(filepathCurrent);
            } catch (err) {
              // File does not exist. That's ok!
            }

          });
        }
      });
    }
  });
});
