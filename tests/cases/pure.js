console.log(typeof Promise);
console.log(typeof Object.fromEntries);
console.log(typeof "abc".padStart);

"abc".padStart(5, "0");
" bc".trimStart();

Promise.resolve(42).then(it => console.log(it));
console.log({ Promise });
Object.fromEntries([['a', 1], ['b', 2]]);
