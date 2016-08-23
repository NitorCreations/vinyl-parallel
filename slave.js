'use strict';

var readableStream = require('readable-stream');
var buffer = require('vinyl-buffer');
var common = require('./common');

var Readable = readableStream.Readable;
var Writable = readableStream.Writable;
var encodeVinyl = common.encodeVinyl;
var decodeVinyl = common.decodeVinyl;

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

Slave.prototype._postMessage = function postMessage(msg) {
  console.log("[slave] postMessage:", msg);
  this.self.postMessage(msg);
};

Slave.prototype._onmessage = function onmessage(msg) {
  var thiz = this;
  var data = msg.data;
  console.log('[slave] onmessage:', data);
  switch (data.type) {
    case 'VinylCreateRequest': {
      var jobName = data.jobName;
      if (!(jobName in this.handlers)) {
        console.error('[slave] No handler for "' + jobName + '". Processing jammed.');
        return;
      }
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId] = {
        jobName: jobName,

        pending: false,
        pendingChunk: null,
        pendingEnc: null,
        readableReady: false,
        readable: new Readable({objectMode: true, read: function _read() {
          if (vinyl.pending) {
            console.log("[slave] _read() pending");
            vinyl.pending = false;
            vinyl.readableReady = false;
            if (this.push(vinyl.pendingChunk, vinyl.pendingEnc)) { // NOTE: _read() may be called again during this call, so state needs to be clean before call
              vinyl.readableReady = true;
            }
            console.log("[slave] readableReady =", vinyl.readableReady);
            thiz._postMessage({
              type: vinyl.pendingChunk !== null ? 'VinylChunkResponse' : 'VinylChunkEndResponse',
              vinylId: vinylId
            });
          } else {
            console.log("[slave] _read() idle");
            vinyl.readableReady = true;
          }
          console.log("[slave] /_read");
        }}),

        writeCb: null,
        writable: new Writable({objectMode: true, decodeStrings: false, write: function write(chunk, encoding, cb) {
          vinyl.writeCb = cb;
          thiz._postMessage({
            type: 'ReturnChunkRequest',
            vinylId: vinylId,
            chunks: [{chunk: encodeVinyl(chunk), enc: encoding}]
          });
        }, writev: function writev(chunks, cb) {
          vinyl.writeCb = cb;
          thiz._postMessage({
            type: 'ReturnChunkRequest',
            vinylId: vinylId,
            chunks: chunks.map(function(e) { return { chunk: encodeVinyl(e.chunk), enc: e.encoding };})
          });
        }})
      };
      var handler = this.handlers[jobName];
      var stream = handler(vinyl.readable, data.jobArg);
      vinyl.writable.on('finish', function() {
        vinyl.writeCb = function onFinishCb(){};
        thiz._postMessage({
          type: 'ReturnChunkRequest',
          vinylId: vinylId,
          chunks: [{chunk: null}]
        });

      });
      console.log("[slave] Connecting streams");
      stream.pipe(buffer()).pipe(vinyl.writable); // TODO support file data streaming instead of using buffer
      thiz._postMessage({
        type: 'VinylCreateResponse',
        vinylId: vinylId
      });
      break;
    }
    case 'VinylChunkRequest': {
      /*       type: 'vinylChunkRequest',
       vinylId: vinylId,
       chunk: chunk,
       enc: enc
       */
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      vinyl.pending = true;
      vinyl.pendingChunk = decodeVinyl(data.chunk);
      vinyl.pendingEnc = data.enc;
      if (vinyl.readableReady) {
        console.log("[slave] chunk req immediate");
        vinyl.readable._read();
        console.log("[slave] /chunk req immediate");
      } else {
        console.log("[slave] chunk req queued");
      }
      break;
    }
    case 'VinylChunkEndRequest': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      vinyl.pending = true;
      vinyl.pendingChunk = null;
      vinyl.pendingEnc = null;
      if (vinyl.readableReady) {
        vinyl.readable._read();
      }
      break;
    }
    case 'ReturnChunkResponse': {
      var vinylId = data.vinylId;
      var vinyl = this.vinyls[vinylId];
      var cb = vinyl.writeCb;
      vinyl.writeCb = null;
      cb();
      break;
    }
    default: {
      console.log("[slave] Unknown message type " + data.type);
    }
  }
  console.log("[slave] /onmessage");
}

Slave.prototype._onerror = function onerror(err) {
  console.log('[slave] Error:', err);
}

module.exports = Slave;
