/* global self */

var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

var slave = new VinylParallel.Slave(self);

slave.on('exampleFilter', function exampleFilter(stream) {
  return stream.pipe(through2.obj(write, end));

  var first = true;
  
  function write(chunk, enc, cb) {
    console.log('[slave] write("' + chunk + '")');
    if (first) {
      first = false;
      this.push("// slave was here!\n");
    }
    cb(null, chunk);
  }
  
  function end(cb) {
    console.log('[slave] end');
    this.push("// slave over and out\n");
    cb();
  }
}

// slave.on('otherFilter', ...);
