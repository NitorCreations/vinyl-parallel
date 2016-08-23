var gulp = require('gulp');
var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

// needed for "sync" task
var slowFilter = require('./slowfilter');

// traditional task
gulp.task('sync', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(slowFilter({ foo: "bar" }))
    .pipe(gulp.dest('target/'));
});

// example task running slowFilter in parallel

var parallel = new VinylParallel('gulpslave.js');

gulp.task('parallel', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(parallel.run('mySlowFilter', { foo: "bar" }))
    .pipe(gulp.dest('target/'));
});

gulp.on('stop', parallel.stop);
