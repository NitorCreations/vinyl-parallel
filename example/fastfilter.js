var through2 = require('through2');

// example fast filter that does not really benefit from parallellism

module.exports = function fastFilter(opts) {
  return through2.obj(write, end);

  function write(chunk, enc, cb) {
    console.log('[fastfilter] write got "',chunk,'"');
    chunk.contents = new Buffer("// fastfilter was here! opts: " + JSON.stringify(opts) + "\n" + chunk.contents.toString() + "// fastfilter over and out\n");
    cb(null, chunk);
    console.log('[fastfilter] /write');
  }
  
  function end(cb) {
    console.log('[fastfilter] end');
    cb();
    console.log('[fastfilter] /end');
  }
};
