var fs = require('fs'),
    express = require('express'),
    multer = require('multer'),
    ndjson = require('ndjson'),
    execStream = require('exec-stream'),
    app = express(),
    diff = require('./diff'),
    validFiles = JSON.parse(fs.readFileSync('./valid-files.json', 'utf8')),
    validator = require('is-my-json-valid'),
    validators = {};

validFiles.forEach(function(validFile) {
  // validFile = "<name>.<extension>"
  var validFileElements = validFile.split('.');
  validators[validFile] = validator(fs.readFileSync("./schemas/" + validFileElements[0] + ".schema.json", "utf8"))
});

app.use(express.static(__dirname + '/public'));

app.get('/data', function(req, res) {
  // TODO: return all data files
});

app.get('/data/:layer', function(req, res) {
  // TODO: return :layer files
});

app.get('/data/:layer/:file', function(req, res) {
  var filename = './data/' + req.params.layer + '/' + req.params.file;
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

app.post('/data/:layer', function(req, res) {
  // TODO: process zip file
});

app.post('/data/:layer/:file', multer({
    dest: './uploads/',
  }),function(req, res) {
    if (fs.existsSync('./data/' + req.params.layer)) {
      if (validFiles.indexOf(req.params.file) > -1) {
        var source = './uploads/' + req.files.file.name;
        var dest = "./data/" + req.params.layer + "/" + req.params.file;

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
                responseError.details.push(validators[req.params.file].errors);
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
              validFiles.map(function(f) { return "'" + req.params.layer + "." + f + "'"; }).join(", ")
        });
      }
    } else {
      res.status(405);
      res.send({
        error: "Layer '" + req.params.layer + "' does not exist"
      });
    }
});

app.listen(process.env.PORT || 8080);
