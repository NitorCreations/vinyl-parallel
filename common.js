var File = require('vinyl');

exports.encodeVinyl = function encodeVinyl(src) {
  return src;
}

function decodeBuffer(src) {
  if (src.type === 'Buffer') {
    return new Buffer(src.data);
  } else {
    throw new Error("Unsupported chunk format: " + src);
  }
}

exports.decodeVinyl = function decodeVinyl(src) {
  var dst = Object.assign(Object.create(File.prototype), src);
  dst._contents = decodeBuffer(src._contents);
  return dst;
};
