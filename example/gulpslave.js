/* global self */

var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

var slowFilter = require('./slowfilter');
var fastFilter = require('./fastfilter');

console.log("[gulpslave] init");

var Slave = VinylParallel.Slave;
var slave = new Slave(self);

slave.on('mySlowFilter', function mySlowFilter(stream, opts) {
  console.log("[gulpslave] slow create", opts);
  return stream.pipe(slowFilter(opts));
  // you can can chain multiple .pipe() calls here just like in gulpfile if needed.
});

slave.on('myFastFilter', function myFastFilter(stream, opts) {
  console.log("[gulpslave] fast create", opts);
  return stream.pipe(fastFilter(opts));
});
