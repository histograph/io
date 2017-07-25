const fs = require('fs-extra');
const path = require('path');
const ndjson = require('ndjson');
const geojsonhint = require('@mapbox/geojsonhint');
const diff = require('./diff');
const validators = require('./validators');
const config = require('histograph-config');

const log = require("histograph-logging");

const my_log = new log("io");

module.exports.process = function(res, dataset, file, filename, force) {
  var newDirname = path.join(config.api.dataDir, 'datasets', dataset);
  var newFilename = path.join(newDirname, file + '.ndjson');

  // create subdir
  fs.mkdirsSync(newDirname);

  var responseError = {
    message: 'NDJSON does not comply to schema',
    details: []
  };

  var finished = false;
  var allValid = true;
  var lineNr = 1;

  fs.createReadStream(filename)
    .pipe(ndjson.parse())
    .on('data', function(obj) {
      var errors;
      var jsonValid = validators[file](obj);
      var thisValid = true;

      if (!jsonValid) {
        errors = validators[file].errors;
        thisValid = false;
      } else if (file === 'pits' && obj.geometry) {
        if (typeof obj.geometry === 'string') {
          errors = 'geometry must be a GeoJSON geometry, not a string';
          thisValid = false;
        } else {
          var geojsonErrors = geojsonhint.hint(obj.geometry);
          if (geojsonErrors.length > 0) {
            errors = geojsonErrors;
            thisValid = false;
          }
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
        done(res, 422, responseError);
        fs.unlinkSync(filename);
      }

      finished = true;

      lineNr += 1;
    })
    .on('end', function() {
      if (allValid) {

        done(res, 200, {
          message: 'ok'
        });

        fs.renameSync(filename, newFilename);

        // TODO: use lock? make sure dest is not overwritten
        // when diff processes file
        diff.fileChanged(dataset, file, force);
      } else if (!finished) {
        done(res, 433, responseError);
        fs.unlinkSync(filename);
      }
    });
};

function done(res, status, message) {
  if (res) {
    res.status(status).send(message);
  } else {
    my_log.info("Uploaded file status: " + status +  ", message: " + JSON.stringify(message));
  }

}
