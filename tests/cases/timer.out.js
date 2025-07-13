import argsSetTimeout from "sky-core/pure/setTimeout";

let args = [0, 1, 2];

setTimeout(function() { }, 0);
setTimeout(function() { });
argsSetTimeout(function() { }, ...args);
argsSetTimeout.apply(window, args);
console.log(argsSetTimeout);
