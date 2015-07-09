var fs = require('fs-extra');
var path = require('path');
var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var JSONStream = require('jsonstream');
var ndjson = require('ndjson');
var cors = require('cors');
var request = require('request');
var crypto = require('crypto');
var geojsonhint = require('geojsonhint');
var basicAuth = require('basic-auth');
var app = express();
var diff = require('./lib/diff');
var auth = require('./lib/auth');
var db = require('./lib/db');
var current = require('./lib/current');
var validators = require('./lib/validators');
var config = require(process.env.HISTOGRAPH_CONFIG);

app.use(bodyParser.json({
  type: 'application/json'
}));

app.use(bodyParser.text({
  type: 'application/x-ndjson'
}));

app.use(cors());

function send200(res) {
  res.status(200).send({
    message: 'ok'
  });
}

function send201(res) {
  res.status(201).send({
    message: 'ok'
  });
}

function send404(res, type, id) {
  res.status(404).send({
    message: type + ' \'' + id + '\' not found'
  });
}

function send409(res, type, id) {
  res.status(409).send({
    message: type + ' \'' + id + '\' already exists'
  });
}

app.get('/sources', function(req, res) {
  db.getSources(res, function(data) {
    res.send(data);
  });
});

app.post('/sources',
  auth.owner,
  function(req, res) {
    var source = req.body;
    if (validators.source(source)) {
      db.getSource(res, source.id, function(data) {
        if (data) {
          send409(res, 'Source', source.id);
        } else {
          var owner = basicAuth(req);
          db.createSource(res, source, owner.name, function() {
            current.createDir(source.id);
            send201(res);
          });
        }
      });
    } else {
      res.status(422).send({
        message: validators.source.errors
      });
    }
  }

);

app.patch('/sources/:source',
  db.sourceExists,
  auth.ownerForSource,
  function(req, res) {
    var source = req.body;

    if (source.id == req.params.source || source.id === undefined) {
      if (validators.source(source)) {
        db.updateSource(res, source, function() {
          send200(res);
        });
      } else {
        res.status(422).send({
          message: validators.source.errors
        });
      }
    } else {
      res.status(422).send({
        message: 'Source ID in URL must match source ID in JSON body'
      });
    }
  }

);

app.delete('/sources/:source',
  db.sourceExists,
  auth.ownerForSource,
  function(req, res) {
    db.deleteSource(res, req.params.source, function() {
      send200(res);

      fs.closeSync(fs.openSync(current.getFilename(req.params.source, 'pits'), 'w'));
      fs.closeSync(fs.openSync(current.getFilename(req.params.source, 'relations'), 'w'));

      diff.fileChanged(req.params.source, 'pits', function() {
        diff.fileChanged(req.params.source, 'relations', function() {
          fs.removeSync(path.join(config.api.dataDir, 'sources', req.params.source));
        });
      });
    });
  }

);

app.get('/sources/:source', function(req, res) {
  db.getSource(res, req.params.source, function(data) {
    if (data) {
      res.send(data);
    } else {
      send404(res, 'Source', req.params.source);
    }
  });
});

app.get('/sources/:source/:file(pits|relations)',
  db.sourceExists,
  function(req, res) {
    var filename = current.getCurrentFilename(req.params.source, req.params.file);
    fs.exists(filename, function(exists) {
      if (exists) {
        var stat = fs.statSync(filename);

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Length': stat.size
        });
        fs.createReadStream(filename).pipe(res);
      } else {
        res.send('');
      }
    });
  }

);

app.put('/sources/:source/:file(pits|relations)',
  db.sourceExists,
  auth.ownerForSource,
  multer({
    dest: path.join(config.api.dataDir, 'uploads')
  }),
  function(req, res) {
    // TODO this path should fail when content-type is different
    req.accepts('application/x-ndjson');

    var uploadedFilename;

    if (req.files && Object.keys(req.files).length > 0) {
      // File upload, multipart/form-data in req.files

      // TODO: make sure to only accept one file at a time
      uploadedFilename = path.join(config.api.dataDir, 'uploads', req.files.file.name);
    } else {
      // JSON POST data in req.body

      var currentDate = (new Date()).valueOf().toString();
      var random = Math.random().toString();

      uploadedFilename = path.join(config.api.dataDir, 'uploads', crypto.createHash('sha1').update(currentDate + random).digest('hex') + '.ndjson');
      var contents;

      // Apparently, req.body == {} when JSON POST data is empty
      if (typeof req.body == 'object' && Object.keys(req.body).length === 0) {
        contents = '';
      } else {
        contents = req.body;
      }

      var file = fs.openSync(uploadedFilename, 'w');
      fs.writeSync(file, contents);
    }

    if (uploadedFilename) {
      var newDirname = path.join(config.api.dataDir, 'sources', req.params.source);
      var newFilename = path.join(newDirname, req.params.file + '.ndjson');

      // create subdir
      fs.mkdirsSync(newDirname);

      var responseError = {
        message: 'NDJSON does not comply to schema',
        details: []
      };

      var finished = false;
      var allValid = true;
      var lineNr = 1;

      fs.createReadStream(uploadedFilename)
        .pipe(ndjson.parse())
        .on('data', function(obj) {
          var errors;
          var jsonValid = validators[req.params.file](obj);
          var thisValid = true;

          if (!jsonValid) {
            errors = validators[req.params.file].errors;
            thisValid = false;
          } else if (req.params.file === 'pits' && obj.geometry) {
            var geojsonErrors = geojsonhint.hint(obj.geometry);
            if (geojsonErrors.length > 0) {
              errors = geojsonErrors;
              thisValid = false;
            }
          }

          if (!thisValid) {
            if (responseError.details.length < 10) {
              responseError.details.push({
                line: lineNr,
                errors: errors
              });
            }

            allValid = false;
          }

          lineNr += 1;
        })
        .on('error', function(err) {

          allValid = false;
          if (responseError.details.length < 10) {
            responseError.details.push({
              line: lineNr,
              errors: err.message
            });
          }

          if (!finished) {
            res.status(422).send(responseError);
            fs.unlinkSync(uploadedFilename);
          }

          finished = true;

          lineNr += 1;
        })
        .on('end', function() {
          if (allValid) {
            send200(res);

            fs.renameSync(uploadedFilename, newFilename);

            // TODO: use lock? make sure dest is not overwritten
            // when diff processes file
            diff.fileChanged(req.params.source, req.params.file);
          } else if (!finished) {
            res.status(422).send(responseError);
            fs.unlinkSync(uploadedFilename);
          }
        });

    } else {
      res.status(422).send({
        message: 'No data received'
      });
    }
  }

);

fs.mkdirsSync(path.join(config.api.dataDir, 'sources'));
fs.mkdirsSync(path.join(config.api.dataDir, 'uploads'));

// app.listen(config.io.port, function() {
//   console.log('Histograph IO listening on port ' + config.io.port);
// });

module.exports = app;
