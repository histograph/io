var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    sourcesDir = './sources',
    files = [
      'pits',
      'relations'
    ];

console.log("Removing source data...")

fs.readdir(sourcesDir, function(err, directories){
  directories.forEach(function (dir) {
    if (dir != '.') {
      fs.stat(sourcesDir + "/" + dir, function (err, stat) {
        if (stat.isDirectory()) {
          var source = dir;
          console.log("  " + source + "/*.ndjson")
          files.forEach(function(file) {
            var filepath = sourcesDir + "/" + source + "/" + file + ".ndjson";
            var filepathCurrent = sourcesDir + "/" + source + "/current/" + file + ".ndjson";

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
