import "sky-core/polyfill/document.head";
import "sky-core/polyfill/String/prototype/includes";
import "sky-core/polyfill/Array/prototype/includes";
import "sky-core/polyfill/Set";

console.log(document.head);
console.log([].includes(1));
console.log(localStorage);

var set = new Set();
function Map() { }
var map = new Map();
