var through2 = require('through2');

// example slow filter that should benefit from parallellism

module.exports = function slowFilter(opts) {
  var counter = 1;
  var endCb = null;

  return through2.obj(write, end);

  function write(chunk, enc, cb) {
    console.log('[slowfilter] write got "',chunk,'"');
    var thiz = this;
    ++counter;
    setTimeout(function slowProgress() {
      console.log('[slowfilter] timeout for "',chunk,'"');
      chunk.contents = new Buffer("// slowfilter was here! opts: " + JSON.stringify(opts) + "\n" + chunk.contents.toString() + "// slowfilter over and out\n");
      thiz.push(chunk, enc);
      --counter;
      checkFinish();
      console.log('[slowfilter] /timeout');
    }, 1000);
    cb();
    console.log('[slowfilter] /write');
  }

  function end(cb) {
    console.log('[slowfilter] end');
    endCb = cb;
    --counter;
    checkFinish();
    console.log('[slowfilter] /end');
  }

  function checkFinish() {
    console.log('[slowfilter] checkFinish() counter=', counter);
    if (counter == 0) {
      console.log('[slowfilter] endCb()');
      endCb();
      console.log('[slowfilter] /endCb()');
    }
  }
};
