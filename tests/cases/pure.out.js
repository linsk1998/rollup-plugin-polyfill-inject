import purePromise from "core-js-pure/actual/promise";
import pureFromEntries from "core-js-pure/actual/object/from-entries";
import padStart from "core-js-pure/actual/string/pad-start";
import trimStart from "core-js-pure/actual/string/trim-start";
import pureSymbol from "sky-core/pure/Symbol";
import pureIterator from "sky-core/pure/Symbol/iterator";

console.log(typeof Promise);
console.log(typeof Object.fromEntries);
console.log(typeof "abc".padStart);
if(purePromise) {
	console.log(purePromise && true);
	console.log(purePromise || true);
	console.log(true && purePromise);
	console.log(true || purePromise);
	console.log(purePromise ? 1 : 2);
}
if(Object.fromEntries) {
	console.log(Object.fromEntries && true);
	console.log(Object.fromEntries || true);
	console.log(true && pureFromEntries);
	console.log(true || pureFromEntries);
	console.log(Object.fromEntries ? 1 : 2);
}
if("abc".padStart) {
	console.log("abc".padStart && true);
	console.log("abc".padStart || true);
	console.log(true && "abc".padStart);
	console.log(true || "abc".padStart);
	console.log("abc".padStart ? 1 : 2);
}

padStart("abc", 5, "0");
trimStart(" bc");

purePromise.resolve(42).then(it => console.log(it));
console.log({ Promise: purePromise });
pureFromEntries([['a', 1], ['b', 2]]);

console.log(pureSymbol);
console.log(pureIterator);
