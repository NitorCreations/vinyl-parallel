var through2 = require('through2');

module.exports = function slowFilter(opts) {
  return through2.obj(write, end);

  function write(chunk, enc, cb) {
    console.log('[slowfilter] write got "',chunk,'"');
    chunk.contents = new Buffer("// slowfilter was here! opts: " + JSON.stringify(opts) + "\n" + chunk.contents.toString() + "// slowfilter over and out\n");
    cb(null, chunk);
    console.log('[slowfilter] /write');
  }
  
  function end(cb) {
    console.log('[slowfilter] end');
    cb();
    console.log('[slowfilter] /end');
  }
};
