/* global self */

console.log("[gulpslave] init");

var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects
var through2 = require('through2');

var Slave = VinylParallel.Slave;
var slave = new Slave(self);

slave.on('exampleFilter', function exampleFilter(stream, opts) {
  console.log("[gulpslave] create", opts);
  return stream.pipe(through2.obj(write, end));

  var first = true;
  
  function write(chunk, enc, cb) {
    console.log('[gulpslave] write got "',chunk,'"');
    chunk.contents = new Buffer("// slave was here!\n" + chunk.contents.toString() + "// slave over and out\n");
    cb(null, chunk);
    console.log('[gulpslave] /write');
  }
  
  function end(cb) {
    console.log('[gulpslave] end');
    cb();
    console.log('[gulpslave] /end');
  }
});

// slave.on('otherFilter', ...);
