var gulp = require('gulp');
var Worker = require('tiny-worker');
var util = require('util');
var through2 = require('obj');

var gulpDone = false;
var workerDone = false;

function maybeTerminate() {
  if (workerDone && gulpDone) {
    worker.terminate();
  }
}

gulp.on('stop', function() {
  gulpDone = true;
  maybeTerminate();
});

var worker = new Worker("gulpslave.js");
worker.onmessage = function(msg) {
  switch (msg.type) {
    case "vinyl":

  }
  console.log("Worker says:", msg.data);
  workerDone = true;
  maybeTerminate();
}

worker.postMessage("master says hi");
worker.onerror = function(err) {
  console.log("Worker error:", err);
}

function VinylParallel(file) {
  Worker.call(this, file);
  this.vinyls = {};
  this.vinylChunks = {};
}

util.inherits(VinylParallel, Worker);

var nextId = 100;

VinylParallel.prototype.run = function run(job, arg) {
  var worker = this;
  var vinylId = nextId++;
  this.postMessage({
    type: "vinylCreateRequest",
    vinylId: vinylId,
    job: job,
    arg: arg
  });
  var stream = through2.obj(write, end);
  this.vinyls[vinylId] = { stream: stream };
  return stream;

  function write(chunk, enc, cb) {
    var vinylChunkId = nextId++;
    worker.vinylChunks[vinylChunkId] = { type: 'write', cb: cb };
    worker.postMessage({
      type: "vinylChunkRequest",
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
      type: "vinylChunkEndRequest",
      vinylId: vinylId,
      vinylChunkId: vinylChunkId
    });
  }
};

VinylParallel.prototype.onmessage = function onmessage(msg) {
  var data = msg.data;
  switch (data.type) {
    case "vinylCreateResponse":
      var vinylId = data.vinylId;
      this.vinyls[vinylId].created = true;
      break;
    case "vinylChunkResponse":
      var vinylId = data.vinylId;
      var vinylChunkId = data.vinylChunkId;
      this.vinylChunks[vinylChunkId].cb(data.err, data.chunk);

  }
};

VinylParallel.prototype.onerror = function onerror(err) {
  console.log("VinylParalllel worker error:", err);
};

module.exports = VinylParalllel;
