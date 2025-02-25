# rollup-plugin-polyfill-inject

auto inject polyfill

## polluting

```javascript
const polyfill = require("rollup-plugin-polyfill-inject");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			polluting: {
				".includes": [
					"core-js/modules/es.array.includes",
					"core-js/modules/es.string.includes"
				],
				"Set": "core-js/modules/es.set",
				"Map": "core-js/modules/es.map"
			},
			exclude: ["**/node_modules/core-js/**"]
		})
	]
}
```

### Before

```javascript
console.log(document.head);
console.log([].includes(1));
console.log(localStorage);

var set=new Set();
function Map(){}
var map=new Map();
```

### After

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

## pure

```javascript
const polyfill = require("rollup-plugin-polyfill-inject");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			pure: {
				".padStart": "core-js-pure/actual/string/pad-start",
				"Promise":"core-js-pure/actual/promise",
				"Object.fromEntries":"core-js-pure/actual/object/from-entries",
			},
			exclude: ["**/node_modules/core-js-pure/**"]
		})
	]
}
```

### Before

```javascript
"abc".padStart(5, "0")

Promise.resolve(42).then(it => console.log(it));

Object.fromEntries([['a', 1], ['b', 2]]);
```

### After

```javascript
import padStart from "core-js-pure/actual/string/pad-start";
import Promise from "core-js-pure/actual/promise";
import fromEntries from "core-js-pure/actual/object/from-entries";

padStart("abc", 5, "0");

Promise.resolve(42).then(it => console.log(it));

fromEntries([['a', 1], ['b', 2]]);
```

## getter

```javascript
const polyfill = require("rollup-plugin-polyfill-inject");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			getter: {
				".textContent": "@/utils/getNodeText",
				"document.currentScript": ["sky-core/utils/getCurrentScript", 'getCurrentScript'],
			}
		})
	]
}
```

### Before

```javascript
var text = document.getElementById("foo").textContent;

var script = document.currentScript;
```

### After

```javascript
import getNodeText from "@/utils/getNodeText";
import { getCurrentScript } from "sky-core/utils/getCurrentScript";

var text = getElementText(document.getElementById("foo"));

var script = getCurrentScript();
```

## setter

```javascript
const polyfill = require("rollup-plugin-polyfill-inject");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
	plugins: [
		nodeResolve(),
		commonjs(),
		polyfill({
			setter: {
				".textContent": "@/utils/setNodeText",
				"document.title": ["@/utils/jsBridge", 'setActivityTitle']
			}
		})
	]
}
```

### Before

```javascript
document.getElementById("foo").textContent = "bar";

document.title = "New Title";
```

### After

```javascript
import setNodeText from "@/utils/setNodeText";
import { setActivityTitle } from "@/utils/jsBridge";

setNodeText(document.getElementById("foo"), "bar");

setActivityTitle("New Title");
```