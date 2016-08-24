var File = require('vinyl');

function encodeBuffer(src) {
  return src.toString();
}

function decodeBuffer(src) {
  return new Buffer(src);
}

exports.encodeVinyl = function encodeVinyl(src) {
  var dst = Object.assign(Object.create(Object.getPrototypeOf(src)), src);
  dst._contents = encodeBuffer(dst._contents);
  return dst;
}

exports.decodeVinyl = function decodeVinyl(src) {
  var dst = Object.assign(Object.create(File.prototype), src);
  dst._contents = decodeBuffer(src._contents);
  return dst;
};
