/* global self */

var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

var slowFilter = require('./slowfilter');

console.log("[gulpslave] init");

var Slave = VinylParallel.Slave;
var slave = new Slave(self);

slave.on('mySlowFilter', function mySlowFilter(stream, opts) {
  console.log("[gulpslave] create", opts);
  return stream.pipe(slowFilter(opts));
  // you can can chain multiple .pipe() calls here just like in gulpfile if needed.
});

// you can have many filters defined in a single slave:
// slave.on('otherFilter', ...);
