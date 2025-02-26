import padStart from "core-js-pure/actual/string/pad-start";
import trimStart from "core-js-pure/actual/string/trim-start";
import Promise from "core-js-pure/actual/promise";
import Object_fromEntries from "core-js-pure/actual/object/from-entries";

padStart("abc", 5, "0");
trimStart(" bc");

Promise.resolve(42).then(it => console.log(it));

Object_fromEntries([['a', 1], ['b', 2]]);
