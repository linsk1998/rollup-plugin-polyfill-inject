
const fs = require('fs');
const rollup = require('rollup');
const polyfill = require('../index');

const dirname = 'tests/cases/';

const test = async function(name, options) {
	let bundle = await rollup.rollup({
		input: `${dirname}/${name}.js`,
		external: (id) => !id.startsWith('.'),
		plugins: [
			polyfill(options)
		]
	});
	let expected = fs.readFileSync(dirname + name + '.out.js', 'utf-8');
	expect(bundle.cache.modules[0].code).toBe(expected);
};

describe('rollup-plugin-polyfill-inject', function() {
	it('polluting', () => test('polluting', {
		polluting: {
			".includes": [
				"sky-core/polyfill/String/prototype/includes",
				"sky-core/polyfill/Array/prototype/includes"
			],
			".forEach": "sky-core/polyfill/Array/prototype/forEach",
			"Set": "sky-core/polyfill/Set",
			"document.head": "sky-core/polyfill/document.head"
		}
	}));
	it('pure', () => test('pure', {
		pure: {
			".padStart": "core-js-pure/actual/string/pad-start",
			".trimStart": "core-js-pure/actual/string/trim-start",
			"Promise": "core-js-pure/actual/promise",
			"Object.fromEntries": "core-js-pure/actual/object/from-entries"
		}
	}));
	it('getter', () => test('getter', {
		getter: {
			".textContent": "@/utils/getNodeText",
			"innerHeight": "@/utils/getInnerHeight",
			"document.currentScript": ["sky-core/utils/getCurrentScript", 'getCurrentScript'],
		}
	}));
	it('setter', () => test('setter', {
		setter: {
			".textContent": "@/utils/setNodeText",
			"document.title": ["@/utils/jsBridge", 'setActivityTitle'],
			"status": ["@/utils/jsBridge", 'setStatusText']
		}
	}));
});
