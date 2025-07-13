let args = [0, 1, 2];

setTimeout(function() { }, 0);
setTimeout(function() { });
setTimeout(function() { }, ...args);
setTimeout.apply(window, args);
console.log(setTimeout);
