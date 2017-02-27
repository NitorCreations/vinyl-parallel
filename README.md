# vinyl-parallel
A vinyl transform that passes the vinyl to a separate node process, and returns the transformed vinyl result

Transports vinyls (including content) to a different process, does whatever processing needed there and then transports the result back. See below urls for example; the example gulpfile contains tasks demontrating traditional use (tasks named `sync-*`) and use together vinyl-parallel (tasks named `parallel-*`). In the latter case the parallel work to be done is implemented in the gulpslave.js file.

The project is mostly finished but I ended up personally using gulp-ll instead in our project because we happened to have enough tasks that we could get decent built times using that. Feel free to report any bugs/improvement ideas you find.

* [example/gulpfile.js](example/gulpfile.js)
* [example/gulpslave.js](example/gulpslave.js)
