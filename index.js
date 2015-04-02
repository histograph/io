var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var ndjson = require('ndjson');
var async = require('async');
var app = express();
var diff = require('./lib/diff');
var config = require(process.env.HISTOGRAPH_CONFIG);
var validator = require('is-my-json-valid');
var validators = {};

app.use(bodyParser.text());

// TODO: consider sorting incoming NDJSON streams:
//
// {'dependencies':
//    'exec-stream': 'git://github.com/roadrunner2/exec-stream.git'}
//
// var execStream = require('exec-stream');
//
// stream
//    .pipe(execStream('sort'));

function createSourceDirs() {
  fs.readdir('./sources', function(err) {
    if (err) {
      fs.mkdirSync('./sources');
    }
  });

  fs.readdir(config.data.dir, function(err, directories) {
    async.eachSeries(directories, function(dir, callback) {

      fs.stat('./sources/' + dir, function(err) {
        if (err) {
          fs.stat(config.data.dir + '/' + dir, function(err, stat) {
            if (stat.isDirectory()) {
              fs.mkdirSync('./sources/' + dir);
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

createSourceDirs();

config.data.validFiles.forEach(function(validFile) {
  // validFile = '<name>.<extension>'
  var validFileElements = validFile.split('.');
  validators[validFile] = validator(fs.readFileSync(config.schemas.dir + '/io/' + validFileElements[0] + '.schema.json', 'utf8'));
});

app.use(express.static(__dirname + '/public'));

app.get('/sources', function(req, res) {
  fs.readdir('./sources', function(err, directories) {

    async.mapSeries(directories, function(dir, callback) {
      if (dir != '.') {
        fs.stat('./sources/' + dir, function(err, stat) {
          if (stat.isDirectory()) {
            callback(null, dir);
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    },

    function(err, dirs) {
      var results = dirs.filter(function(dir) {
        return dir;
      }).map(function(dir) {
        return {
          name: dir
        };
      });

      res.send(results);
    });
  });
});

app.get('/sources/:source', function(req, res) {
  async.filterSeries(config.data.validFiles, function(file, callback) {
    fs.exists('./sources/' + req.params.source + '/' + file, function(exists) {
      callback(exists);
    });
  },

  function(files) {
    res.send(files.reduce(function(o, v) {
      o[v.split('.')[0]] = 'http://' + config.io.host + ':' + config.io.port + '/sources/' + req.params.source + '/' + v;
      return o;
    }, {}));
  });

});

app.get('/sources/:source/:file', function(req, res) {
  var filename = './sources/' + req.params.source + '/' + req.params.file;
  fs.exists(filename, function(exists) {
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

app.post('/sources/:source/:file',
  multer({
    dest: './uploads/'
  }),
  function(req, res) {
    if (fs.existsSync('./sources/' + req.params.source)) {
      if (config.data.validFiles.indexOf(req.params.file) > -1) {
        var source;
        var responseError;

        if (req.files && Object.keys(req.files).length > 0) {
          // File upload, multipart/form-data in req.files

          // TODO: make sure to only accept one file at a time
          source = './uploads/' + req.files.file.name;
        } else {
          // JSON POST data in req.body

          var currentDate = (new Date()).valueOf().toString();
          var random = Math.random().toString();
          var filename = crypto.createHash('sha1').update(currentDate + random).digest('hex');

          source = './uploads/' + filename;
          var contents;

          // Apparently, req.body == {} when JSON POST data is empty
          if (typeof req.body == 'object' && Object.keys(req.body).length === 0) {
            contents = '';
          } else {
            contents = req.body;
          }

          var file = fs.openSync(source, 'w');
          fs.writeSync(file, contents);
        }

        if (source) {
          var dest = './sources/' + req.params.source + '/' + req.params.file;

          if (req.params.file.split('.')[1] == 'ndjson') {
            responseError = {
              error: 'NDJSON does not comply to schema',
              details: []
            };

            var allValid = true;

            fs.createReadStream(source)
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
                  diff.fileChanged(req.params.source, req.params.file);
                } else {
                  res.status(422);
                  res.send(responseError);
                  fs.unlinkSync(source);
                }
              });
          } else {
            // TODO: check file size!

            var json;
            var valid = false;

            responseError = null;

            try {
              json = JSON.parse(fs.readFileSync(source, 'utf8'));
              valid = validators[req.params.file](json);
            } catch (e) {
              responseError = {
                error: 'Error parsing JSON',
                details: e
              };
            }

            if (valid) {
              res.sendStatus(200);
              fs.renameSync(source, dest);

              diff.fileChanged(req.params.source, req.params.file);
            } else {
              res.status(405);
              if (validators[req.params.file].errors) {
                responseError = {
                  error: 'File does not comply to JSON schema',
                  details: validators[req.params.file].errors
                };
              }

              res.send(responseError);
              fs.unlinkSync(source);
            }
          }
        } else {
          res.status(422);
          res.send({
            error: 'No data received'
          });
        }

      } else {
        res.status(405);
        res.send({
          error: 'Filename not valid for source \'' + req.params.source + '\'. Should be one of the following: ' +
              config.data.validFiles.map(function(f) { return '\'' + req.params.source + '.' + f + '\''; }).join(', ')
        });
      }
    } else {
      res.status(405);
      res.send({
        error: 'Source \'' + req.params.source + '\' does not exist'
      });
    }
  });

app.listen(config.io.port, function() {
  console.log('Histograph IO listening on port ' + config.io.port);
});
