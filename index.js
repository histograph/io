var fs = require('fs'),
    express = require('express'),
    multer = require('multer'),
    ndjson = require('ndjson'),
    async = require('async'),
    execStream = require('exec-stream'),
    app = express(),
    diff = require('./lib/diff'),
    config = require(process.env.HISTOGRAPH_CONFIG),
    validator = require('is-my-json-valid'),
    validators = {};

function createLayerDirs () {
	fs.readdir('./layers', function(err, directories) {
		if(err) {
			fs.mkdirSync("./layers");
		}
	});

	fs.readdir(config.data.dir, function(err, directories) {
		async.eachSeries(directories, function(dir, callback) {

			fs.stat("./layers/" + dir, function (err, stat) {
				if (err) {
					fs.stat(config.data.dir + "/" + dir, function (err, stat2) {
						if (stat2.isDirectory()) {
							fs.mkdirSync("./layers/" + dir);
						}
						callback();
					});
					callback();
				} else {
					callback();
				}
			});
		});
	});
}

createLayerDirs();

config.data.validFiles.forEach(function(validFile) {
  // validFile = "<name>.<extension>"
  var validFileElements = validFile.split('.');
  validators[validFile] = validator(fs.readFileSync("./schemas/" + validFileElements[0] + ".schema.json", "utf8"))
});

app.use(express.static(__dirname + '/public'));

app.get('/layers', function(req, res) {
  fs.readdir('./layers', function(err, directories) {

    async.mapSeries(directories, function(dir, callback) {
      if (dir != '.') {
        fs.stat("./layers/" + dir, function (err, stat) {
          if (stat.isDirectory()) {
            callback(null, dir);
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    }, function(err, dirs) {
      var results = dirs.filter(function(dir) {
        return dir;
      }).map(function(dir) {
        return {
          name: dir
        }
      });
      res.send(results);
    });
  });
});

app.get('/layers/:layer', function(req, res) {
  async.filterSeries(config.data.validFiles, function(file, callback) {
    fs.exists("./layers/" + req.params.layer + "/" + file, function (exists) {
      callback(exists);
    });
  }, function(files) {
    res.send(files.reduce(function(o, v, i) {
      o[v.split(".")[0]] = "http://localhost:8080/layers/" + req.params.layer + "/" + v;
      return o;
    }, {}));
  });

});

app.get('/layers/:layer/:file', function(req, res) {
  var filename = './layers/' + req.params.layer + '/' + req.params.file;
  fs.exists(filename, function (exists) {
    if (exists) {
      var stat = fs.statSync(filename);

      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': stat.size
      });
      fs.createReadStream(filename).pipe(res);
    } else {
      res.status(404);
      res.send({ error: 'Not found' });
    }
  });
});

app.post('/layers/:layer', function(req, res) {
  // TODO: process zip file
});

app.post('/layers/:layer/:file', multer({
    dest: './uploads/',
  }),function(req, res) {
    if (fs.existsSync('./layers/' + req.params.layer)) {
      if (config.data.validFiles.indexOf(req.params.file) > -1) {

        // TODO: check whether req.files is empty.
        // either process files, or streaming POST data

        var source = './uploads/' + req.files.file.name;
        var dest = "./layers/" + req.params.layer + "/" + req.params.file;

        if (req.params.file.split(".")[1] == "ndjson") {
          var responseError = {
                error: "NDJSON does not comply to schema",
                details: []
              },
              allValid = true;

          fs.createReadStream(source)
            .pipe(execStream('sort'))
            .pipe(ndjson.parse())
            .on('data', function(obj) {
              var valid = validators[req.params.file](obj);
              if (!valid) {
                if (responseError.details < 10) {
                  responseError.details.push(validators[req.params.file].errors);
                }
                allValid = false;
              }
            })
            .on('error', function(err) {
              allValid = false;
              if (responseError.details < 10) {
                responseError.details.push({
                  errors: err
                });
              }

              // TODO: DRY! Refactor!
              res.status(422);
              res.send(responseError);
              fs.unlinkSync(source);

            })
            .on('end', function() {

              if (allValid) {
                res.sendStatus(200);
                fs.renameSync(source, dest);

                // TODO: use lock? make sure dest is not overwritten
                // when diff processes file
                diff.fileChanged(req.params.layer, req.params.file);
              } else {
                res.status(422);
                res.send(responseError);
                fs.unlinkSync(source);
              }
            });

        } else {
          // TODO: check file size!

          var json,
              responseError,
              valid = false;

          try {
            json = JSON.parse(fs.readFileSync(source, 'utf8'));
            valid = validators[req.params.file](json);
          } catch (e) {
            responseError = {
              error: "Error parsing JSON",
              details: e
            };
          }

          if (valid) {
            res.sendStatus(200);
            fs.renameSync(source, dest);

            diff.fileChanged(req.params.layer, req.params.file);
          } else {
            res.status(405);
            if (validators[req.params.file].errors) {
              responseError = {
                error: "File does not comply to JSON schema",
                details: validators[req.params.file].errors
              };
            }

            res.send(responseError);
            fs.unlinkSync(source);
          }
        }
      } else {
        res.status(405);
        res.send({
          error: "Filename not valid for layer '" + req.params.layer + "'. Should be one of the following: " +
              config.data.validFiles.map(function(f) { return "'" + req.params.layer + "." + f + "'"; }).join(", ")
        });
      }
    } else {
      res.status(405);
      res.send({
        error: "Layer '" + req.params.layer + "' does not exist"
      });
    }
});

var server = app.listen(config.io.port, function () {
	console.log('Histograph IO listening on port ' + config.io.port);
});
