'use strict';

var readableStream = require('readable-stream');
var buffer = require('vinyl-buffer');

var Readable = readableStream.Readable;
var Writable = readableStream.Writable;

function Slave(self) {
  self.onmessage = this._onmessage.bind(this);
  self.onerror = this._onerror.bind(this);
  this.self = self;
  this.handlers = {};
  this.vinyls = {};
}

Slave.prototype.on = function on(jobName, handler) {
  this.handlers[jobName] = handler;
};

Slave.prototype._onmessage = function onmessage(msg) {
  var self = this.self;
  var data = msg.data;
  console.log('[slave] Message:', data);
  switch (data.type) {
    case 'VinylCreateRequest': {
      console.log("[slave] 0");
      var jobName = data.jobName;
      console.log("[slave] 1");
      if (!(jobName in this.handlers)) {
        console.error('[slave] No handler for "' + jobName + '". Processing jammed.');
        return;
      }
      var vinylId = data.vinylId;
      console.log("[slave] 4");
      var vinyl = this.vinyls[vinylId] = {
        jobName: jobName,

        pending: false,
        pendingChunk: null,
        pendingEnc: null,
        readableReady: false,
        readable: new Readable({objectMode: true, read: function read() {
          if (vinyl.pending) {
            vinyl.readableReady = this.push(vinyl.pendingChunk, vinyl.pendingEnc);
            console.log("data = ", data);
            self.postMessage({
              type: vinyl.pendingChunk !== null ? 'VinylChunkResponse' : 'VinylChunkEndResponse',
              vinylId: vinylId,
              vinylChunkId: data.vinylChunkId
            });
            vinyl.pending = false;
          } else {
            vinyl.readableReady = true;
          }
        }}),

        writeCb: null,
        writable: new Writable({objectMode: true, decodeStrings: false, write: function write(chunk, encoding, cb) {
          vinyl.writeCb = cb;
          self.postMessage({
            type: 'ReturnChunkRequest',
            vinylId: vinylId,
            chunks: [{chunk: chunk, enc: encoding}]
          });
        }, writev: function writev(chunks, cb) {
          vinyl.writeCb = cb;
          self.postMessage({
            type: 'ReturnChunkRequest',
            vinylId: vinylId,
            chunks: chunks.map(function(e) { return { chunk: e.chunk, enc: e.encoding };})
          });
        }})
      };
      console.log("[slave] 7");
      var handler = this.handlers[jobName];
      console.log("[slave] 8");
      var stream = handler(vinyl.readable, data.jobArg);
      console.log("[slave] 9");
      vinyl.writable.on('finish', function() {
        self.postMessage({
          type: 'ReturnChunkRequest',
          vinylId: vinylId,
          chunks: [{chunk: null}]
        });

      });
      stream.pipe(buffer()).pipe(vinyl.writable); // TODO support file data streaming instead of using buffer
      this.self.postMessage({
        type: 'VinylCreateResponse',
        vinylId: vinylId
      });
      break;
    }
    case 'VinylChunkRequest': {
      /*       type: 'vinylChunkRequest',
       vinylId: vinylId,
       vinylChunkId: vinylChunkId,
       chunk: chunk,
       enc: enc
       */
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      vinyl.pending = true;
      vinyl.pendingChunk = data.chunk;
      vinyl.pendingEnc = data.enc;
      vinyl.pendingChunkId = data.vinylChunkId;
      if (vinyl.readableReady) {
        vinyl.readable._read();
      }
      break;
    }
    case 'VinylChunkEndRequest': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      vinyl.pending = true;
      vinyl.pendingChunk = null;
      vinyl.pendingEnc = null;
      vinyl.pendingChunkId = data.vinylChunkId;
      if (vinyl.readableReady) {
        vinyl.readable._read();
      }
      break;
    }
    case 'ReturnChunkResponse': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      var cb = vinyl.writecb;
      vinyl.writecb = null;
      cb();
      break;
    }
    default: {
      console.log("[slave] Unknown message type " + data.type);
    }
  }
}

Slave.prototype._onerror = function onerror(err) {
  console.log('[slave] Error:', err);
}

module.exports = Slave;
