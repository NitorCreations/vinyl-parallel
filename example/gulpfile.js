var gulp = require('gulp');
var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

console.log(VinylParallel);

var parallel = new VinylParallel('gulpslave.js');

gulp.task('default', function() {
  return gulp.src('test.js')
    .pipe(parallel.run('exampleFilter', { foo: "bar" }))
    .pipe(gulp.dest('target/'));
});

gulp.on('stop', parallel.stop);
