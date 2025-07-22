console.log(typeof Promise);
console.log(typeof Object.fromEntries);
console.log(typeof "abc".padStart);
if(Promise) {
	console.log(Promise && true);
	console.log(Promise || true);
	console.log(true && Promise);
	console.log(true || Promise);
	console.log(Promise ? 1 : 2);
}
if(Object.fromEntries) {
	console.log(Object.fromEntries && true);
	console.log(Object.fromEntries || true);
	console.log(true && Object.fromEntries);
	console.log(true || Object.fromEntries);
	console.log(Object.fromEntries ? 1 : 2);
}
if("abc".padStart) {
	console.log("abc".padStart && true);
	console.log("abc".padStart || true);
	console.log(true && "abc".padStart);
	console.log(true || "abc".padStart);
	console.log("abc".padStart ? 1 : 2);
}

"abc".padStart(5, "0");
" bc".trimStart();

Promise.resolve(42).then(it => console.log(it));
console.log({ Promise });
Object.fromEntries([['a', 1], ['b', 2]]);

console.log(Symbol);
console.log(Symbol.iterator);
