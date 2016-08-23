'use strict';

var Worker = require('tiny-worker');
var util = require('util');
var through2 = require('through2');
var buffer = require('vinyl-buffer');
var multipipe = require('multipipe');
var fs = require('fs');
var common = require('./common');

var encodeVinyl = common.encodeVinyl;
var decodeVinyl = common.decodeVinyl;

var nextId = 100;

function VinylParallel(file) {
  var file = fs.realpathSync(file);
  this.worker = new Worker(eval("(function(){\nrequire(" + JSON.stringify(file) + ");})"));
  this.worker.onmessage = this._onmessage.bind(this);
  this.worker.onerror = this._onerror.bind(this);
  this.vinyls = {};
  this.stop = VinylParallel.prototype.stop.bind(this);
}

VinylParallel.prototype._postMessage = function postMessage(msg) {
  console.log("[master] postMessage:", msg);
  this.worker.postMessage(msg);
};

VinylParallel.prototype.run = function run(jobName, jobArg) {
  var thiz = this;
  var vinylId = nextId++;
  this._postMessage({
    type: 'VinylCreateRequest',
    vinylId: vinylId,
    jobName: jobName,
    jobArg: jobArg
  });
  var stream = through2.obj(write, end);
  var vinyl = this.vinyls[vinylId] = {
    stream: stream,
    writeCb: null,
    endcb: null
  };
  return multipipe(buffer(), stream); // TODO support file data streaming instead of using buffer

  function write(chunk, enc, cb) {
    if (vinyl.writeCb !== null) {
      // assumption based on understanding: write will not be called again until cb() is called
      throw new Error("write() called before previous callback invoked");
    }
    vinyl.writeCb = function() {
      vinyl.writeCb = null;
      cb.apply(this, arguments);
    };
    thiz._postMessage({
      type: 'VinylChunkRequest',
      vinylId: vinylId,
      chunk: encodeVinyl(chunk),
      enc: enc
    });
  }

  function end(cb) {
    vinyl.endcb = cb;
    thiz._postMessage({
      type: 'VinylChunkEndRequest',
      vinylId: vinylId
    });
  }
};

VinylParallel.prototype._onmessage = function onmessage(msg) {
  var data = msg.data;
  console.log("[master] onmessage:", data);
  switch (data.type) {
    case 'VinylCreateResponse': {
      var vinylId = data.vinylId;
      this.vinyls[vinylId].created = true;
      break;
    }
    case 'VinylChunkResponse': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      var cb = vinyl.writeCb;
      vinyl.writeCb = null;
      cb();
      break;
    }
    case 'VinylChunkEndResponse': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      var cb = vinyl.endcb;
      vinyl.endcb = null;
      cb();
      break;
    }
    case 'ReturnChunkRequest': {
      var vinyl = this.vinyls[data.vinylId];
      for (var i=0; i<data.chunks.length; ++i) {
        var c = data.chunks[i];
	console.log("[master] chunk:", c);
	if (c.chunk !== null) {
          vinyl.stream.push(decodeVinyl(c.chunk), c.enc);
	} else {
          vinyl.stream.push(null);
	}
      }
      this._postMessage({
        type: 'ReturnChunkResponse',
        vinylId: data.vinylId
      });
      break;
    }
  }
  console.log("[master] /onmessage");
};

VinylParallel.prototype._onerror = function onerror(err) {
  console.log('VinylParallel worker error:', err);
};

VinylParallel.prototype.maybeTerminate = function maybeTerminate() {
  if (this.doStop && this.active === 0) {
    this.terminate();
  }
}

VinylParallel.prototype.stop = function stop() {
  this.doStop = true;
  this.maybeTerminate();
};

VinylParallel.Slave = require('./slave');

module.exports = VinylParallel;
