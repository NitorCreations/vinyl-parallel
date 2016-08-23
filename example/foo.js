//var Buffer = require('buffer').Buffer;
console.log(Buffer);
var x = new Buffer(new Uint16Array([1,2,3]));
//var x = Buffer.from('ABC');
console.log(x);
console.log(JSON.stringify(x));
