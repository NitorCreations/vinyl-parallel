'use strict';

var Worker = require('tiny-worker');
var util = require('util');
var through2 = require('through2');
var buffer = require('vinyl-buffer');
var multipipe = require('multipipe');

var nextId = 100;

function VinylParallel(file) {
  Worker.call(this, file);
  this.vinyls = {};
  this.chunks = {};
}

util.inherits(VinylParallel, Worker);

VinylParallel.prototype.run = function run(jobName, jobArg) {
  var worker = this;
  var vinylId = nextId++;
  this.postMessage({
    type: 'vinylCreateRequest',
    vinylId: vinylId,
    jobName: jobName,
    jobArg: jobArg
  });
  var stream = through2.obj(write, end);
  this.vinyls[vinylId] = { stream: stream };
  return multipipe(buffer, stream); // TODO support file data streaming instead of using buffer

  // assumption based on understanding: write will not be called again unti cb() is called
  function write(chunk, enc, cb) {
    var vinylChunkId = nextId++;
    worker.vinylChunks[vinylChunkId] = { type: 'write', cb: cb };
    worker.postMessage({
      type: 'vinylChunkRequest',
      vinylId: vinylId,
      vinylChunkId: vinylChunkId,
      chunk: chunk,
      enc: enc
    });
  }

  function end(cb) {
    var vinylChunkId = nextId++;
    worker.vinylChunks[vinylChunkId] = { type: 'end', cb: cb };
    worker.postMessage({
      type: 'vinylChunkEndRequest',
      vinylId: vinylId,
      vinylChunkId: vinylChunkId
    });
  }
};

VinylParallel.prototype.onmessage = function onmessage(msg) {
  var data = msg.data;
  switch (data.type) {
    case 'vinylCreateResponse': {
      var vinylId = data.vinylId;
      this.vinyls[vinylId].created = true;
      break;
    }
    case 'vinylChunkResponse': {
      var vinylChunkId = data.vinylChunkId;
      var vinylChunk = this.vinylChunks[vinylChunkId];
      if (vinylChunk.type !== 'write') {
        throw new Error('Protocol error, expected "write" but got: ' + vinylChunk.type);
      }
      vinylChunk.cb();
      break;
    }
    case 'VinylChunkEndResponse': {
      var vinylChunkId = data.vinylChunkId;
      var vinylChunk = this.vinylChunks[vinylChunkId];
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
      this.postMessage({
        type: 'ReturnChunkResponse',
        vinylId: data.vinylId
      });
      break;
    }
  }
};

VinylParallel.prototype.onerror = function onerror(err) {
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

module.exports = VinylParalllel;
