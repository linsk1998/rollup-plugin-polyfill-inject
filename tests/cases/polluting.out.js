import "sky-core/polyfill/Set";
import "sky-core/polyfill/document.head";
console.log(document.head);
console.log([].includes(1));
console.log(localStorage);

var set = new Set();
function Map() { }
var map = new Map();
