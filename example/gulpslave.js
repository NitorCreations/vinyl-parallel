/* global self */

var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects
var through2 = require('through2');

var Slave = VinylParallel.Slave;
var slave = new Slave(self);

slave.on('exampleFilter', function exampleFilter(stream, opts) {
  console.log("[ef] create", opts);
  return stream.pipe(through2.obj(write, end));

  var first = true;
  
  function write(chunk, enc, cb) {
    console.log('[ef] write("',chunk,'")');
    if (first) {
      first = false;
      this.push("// slave was here!\n");
    }
    cb(null, chunk);
  }
  
  function end(cb) {
    console.log('[ef] end');
    this.push("// slave over and out\n");
    cb();
  }
});

// slave.on('otherFilter', ...);
