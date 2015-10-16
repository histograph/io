var fs = require('fs');
var diff = require('diff-utility');
var current = require('./current');
var queue = require('./queue');
var H = require('highland');

var types = {
  pits: 'pit',
  relations: 'relation'
};

function intoRedis() {
  return function(err, x, push, next)
  {
    // pass errors along the stream and consume next value
    if (err) {
      push(err);
      next();
      return;
    }

    // pass nil (end event) along the stream, don't call next
    if (x === H.nil)
    {
      push(null, x);
      return;
    }

    // ok, process the thing, wait until it's done to call next()
    queue.add(x, function doneCallback(qsize) {
      // just report on the queue size
      push(null, {data: x, queueSize: qsize});
      next();
    });
  };
}

function fileChanged(dataset, type, force, callback) {
  // takes diffs and turns them into change-items,
  // dictionaries with: dataset, type, action and data properties
  //
  // if specified, it runs callback when done processing the whole diff
  var diffsToChangeItems = function() {

    var previousItem;
    var previousLine;

    return function(err, line, push, next)
    {
      // pass errors along the stream and consume next value
      if (err)
      {
        push(err);
        next();
        return;
      }

      // end of stream
      if (line === H.nil)
      {
        // "add to queue"
        if (previousItem)
          push(null, previousItem);

        // pass nil (end event) along the stream
        push(null, H.nil);

        // done with this event
        return;
      }

      // ok, we have a line
      var item = {
        dataset: dataset,
        type: types[type],
        action: (line.type == 'in') ? 'add' : 'delete',
        data: JSON.parse(line.str)
      };

      // this bit of magic detects if we are dealing with an update, it seems
      if (previousItem &&
        item.type == 'pit' &&
        item.data.id == previousItem.data.id &&
        line.change == 'change' &&
        line.change == previousLine.change &&
        line.line == previousLine.line)
      {
        // mark it as update
        item.action = 'update';
      }
      else
      {
        // not an update, emit it
        if (previousItem)
          push(null, previousItem);
      }

      previousItem = item;
      previousLine = line;

      // and done with this event
      next();
    };
  };

  var filePath = current.getFilename(dataset, type);

  var s;
  if (!force) {
    // force === false
    // Run diff, compare with current version of file,
    // and only send changes to queue

    s = diff(current.getCurrent(filePath), filePath, {stream: true})
      .filter(H.get('str')) // skip empty lines (`.str` property === "")
      .consume(diffsToChangeItems());

  } else {

    // force === true
    // Don't run diff, but write each line
    // to the queue directly!

    s = H(fs.createReadStream(filePath))
      .splitBy('\n')
      .map(JSON.parse.bind(JSON))
      .map(function(obj) {
        return {
          dataset: dataset,
          type: types[type],
          action: 'add',
          data: obj
        };
      });
  }

  s.consume(intoRedis()).done(function() {
    current.setCurrent(filePath);
    if (callback) {
      callback()
    }
  });
}

module.exports.fileChanged = fileChanged;
