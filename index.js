'use strict';

var Worker = require('tiny-worker');
var util = require('util');
var through2 = require('through2');
var buffer = require('vinyl-buffer');
var multipipe = require('multipipe');
var fs = require('fs');

var nextId = 100;

function VinylParallel(file) {
  var file = fs.realpathSync(file);
  this.worker = new Worker(eval("(function(){\nrequire(" + JSON.stringify(file) + ");})"));
  this.worker.onmessage = this._onmessage.bind(this);
  this.worker.onerror = this._onerror.bind(this);
  this.vinyls = {};
  this.chunks = {};
}

VinylParallel.prototype.run = function run(jobName, jobArg) {
  var thiz = this;
  var vinylId = nextId++;
  this.worker.postMessage({
    type: 'VinylCreateRequest',
    vinylId: vinylId,
    jobName: jobName,
    jobArg: jobArg
  });
  var stream = through2.obj(write, end);
  this.vinyls[vinylId] = { stream: stream };
  return multipipe(buffer(), stream); // TODO support file data streaming instead of using buffer

  // assumption based on understanding: write will not be called again unti cb() is called
  function write(chunk, enc, cb) {
    var vinylChunkId = nextId++;
    thiz.chunks[vinylChunkId] = { type: 'write', cb: cb };
    thiz.worker.postMessage({
      type: 'VinylChunkRequest',
      vinylId: vinylId,
      vinylChunkId: vinylChunkId,
      chunk: chunk,
      enc: enc
    });
  }

  function end(cb) {
    var vinylChunkId = nextId++;
    thiz.chunks[vinylChunkId] = { type: 'end', cb: cb };
    thiz.worker.postMessage({
      type: 'VinylChunkEndRequest',
      vinylId: vinylId,
      vinylChunkId: vinylChunkId
    });
  }
};

VinylParallel.prototype._onmessage = function onmessage(msg) {
  var data = msg.data;
  console.log("[master] Message:", data);
  switch (data.type) {
    case 'VinylCreateResponse': {
      var vinylId = data.vinylId;
      this.vinyls[vinylId].created = true;
      break;
    }
    case 'VinylChunkResponse': {
      var vinylChunkId = data.vinylChunkId;
      var vinylChunk = this.chunks[vinylChunkId];
      if (vinylChunk.type !== 'write') {
        throw new Error('Protocol error, expected "write" but got: ' + vinylChunk.type);
      }
      vinylChunk.cb();
      break;
    }
    case 'VinylChunkEndResponse': {
      var vinylChunkId = data.vinylChunkId;
      var vinylChunk = this.chunks[vinylChunkId];
      if (vinylChunk.type !== 'end') {
        throw new Error('Protocol error, expected "end" but got: ' + vinylChunk.type);
      }
      vinylChunk.cb();
      break;
    }
    case 'ReturnChunkRequest': {
      var vinyl = this.vinyls[data.vinylId];
      for (var i=0; i<data.chunks.length; ++i) {
        var c = data.chunks[i];
        vinyl.stream.push(c.chunk, c.enc);
      }
      this.worker.postMessage({
        type: 'ReturnChunkResponse',
        vinylId: data.vinylId
      });
      break;
    }
  }
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
