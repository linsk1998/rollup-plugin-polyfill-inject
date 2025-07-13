import padStart from "core-js-pure/actual/string/pad-start";
import trimStart from "core-js-pure/actual/string/trim-start";
import purePromise from "core-js-pure/actual/promise";
import pureFromEntries from "core-js-pure/actual/object/from-entries";

console.log(typeof Promise);
console.log(typeof Object.fromEntries);
console.log(typeof "abc".padStart);

padStart("abc", 5, "0");
trimStart(" bc");

purePromise.resolve(42).then(it => console.log(it));
console.log({ Promise: purePromise });
pureFromEntries([['a', 1], ['b', 2]]);
