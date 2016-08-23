var gulp = require('gulp');
var VinylParallel = require('..'); // replace '..' with 'vinyl-parallel' in real projects

// needed for "sync*" tasks
var slowFilter = require('./slowfilter');
var fastFilter = require('./fastfilter');

// traditional tasks

gulp.task('sync-slow', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(slowFilter({ foo: "bar" }))
    .pipe(gulp.dest('target/sync-slow/'));
});

gulp.task('sync-fast', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(fastFilter({ foo: "bar" }))
    .pipe(gulp.dest('target/sync-fast/'));
});

gulp.task('sync', ['sync-slow', 'sync-fast']);

// example tasks running slowFilter/fastFilter in parallel

var parallel = new VinylParallel('gulpslave.js');

gulp.task('parallel-slow', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(parallel.run('mySlowFilter', { foo: "bar" }))
    .pipe(gulp.dest('target/parallel-slow/'));
});

gulp.task('parallel-fast', function() {
  console.log("[gulpfile] default-task");
  return gulp.src('test*.js')
    .pipe(parallel.run('myFastFilter', { foo: "bar" }))
    .pipe(gulp.dest('target/parallel-fast/'));
});

gulp.task('parallel', ['parallel-slow', 'parallel-fast']);

gulp.on('stop', parallel.stop);
