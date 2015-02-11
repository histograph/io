var fs = require('fs'),
    express = require('express'),
    multer = require('multer'),
    execStream = require('exec-stream'),
    app = express(),
    spawn = require('child_process').spawn;



app.use(express.static(__dirname + '/public'));

app.get('/data', function(req, res) {
  // TODO: return all data files
});

app.get('/data/:source', function(req, res) {
  // TODO: return :source files
});

app.get('/data/:source/:file', function(req, res) {
  var filename = './data/' + req.params.source + '/' + req.params.file;
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

app.post('/data/:source', function(req, res) {
  // TODO: process zip file
});

app.post('/data/:source/:file', multer({
    dest: './uploads/',
  }),function(req,res) {
    // TODO: kijk of dir source bestaat
    var source = './uploads/' + req.files.file.name;
    var dest = "./data/" + req.params.source + "/" + req.params.file;

    fs.createReadStream(source)
      .pipe(execStream('sort'))
      // .pipe(ndjson.parse())
      // .on('data', function(obj) {
      //   if (isvalid(obj)) {
      //
      //   }
      // })
      .pipe(fs.createWriteStream(dest));

    fs.unlinkSync(source);

    res.sendStatus(200);
});

app.listen(process.env.PORT || 8080);
