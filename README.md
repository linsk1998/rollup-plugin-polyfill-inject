# rollup-plugin-polyfill-inject

auto inject polyfill

## Config

```javascript
var polyfill = require("rollup-plugin-polyfill-inject");
var commonjs = require("@rollup/plugin-commonjs");
var {nodeResolve} =require("@rollup/plugin-node-resolve");
export default {
	input: "./src/demo.js",
	output: {
		file: "./dist/demo.js",
		format: "iife"
	},
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			"modules": {
				".includes": ["core-js/modules/es.array.includes", "core-js/modules/es.string.includes"],
				"Set":"core-js/modules/es.set",
				"Map":"core-js/modules/es.map",
			},
			"exclude":["**/node_modules/core-js/**"]
		})
	]
}
```

## Before

```javascript
console.log(document.head);
console.log([].includes(1));
console.log(localStorage);

var set=new Set();
function Map(){}
var map=new Map();
```

## After

```javascript
import "core-js/modules/es.array.includes";
import "core-js/modules/es.string.includes";
import "core-js/modules/es.set";

console.log(document.head);
console.log([].includes(1));
console.log(localStorage);

var set=new Set();
function Map(){}
var map=new Map();
```

## core-js Config

```javascript
var polyfill = require("rollup-plugin-polyfill-inject");
var commonjs = require("@rollup/plugin-commonjs");
var {nodeResolve} =require("@rollup/plugin-node-resolve");
export default {
	input: "./src/demo.js",
	output: {
		file: "./dist/demo.js",
		format: "iife"
	},
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			"core-js":{
				"preset":["ES2020"],
				"version":3
			},
			"modules": {
				"document.head":"sky-core/polyfill/document/head",
				"localStorage":"sky-core/polyfill/localStorage"
			},
			"exclude":["**/node_modules/core-js/**"]
		})
	]
}
```