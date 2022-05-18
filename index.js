
var estreeWalker = require('estree-walker');
var MagicString = require('magic-string');
var pluginutils = require('@rollup/pluginutils');

var isReference = function(node, parent) {
	if(node.type === 'MemberExpression') {
		return !node.computed && isReference(node.object, node);
	}

	if(node.type === 'Identifier') {
		// TODO is this right?
		if(parent.type === 'MemberExpression') { return parent.computed || node === parent.object; }

		// disregard the `bar` in { bar: foo }
		if(parent.type === 'Property' && node !== parent.value) { return false; }

		// disregard the `bar` in `class Foo { bar () {...} }`
		if(parent.type === 'MethodDefinition') { return false; }

		// disregard the `bar` in `export { foo as bar }`
		if(parent.type === 'ExportSpecifier' && node !== parent.local) { return false; }

		// disregard the `bar` in `import { bar as foo }`
		if(parent.type === 'ImportSpecifier' && node === parent.imported) { return false; }

		return true;
	}

	return false;
};

var flatten = function(startNode) {
	var parts = [];
	var node = startNode;

	while(node.type === 'MemberExpression') {
		parts.unshift(node.property.name);
		node = node.object;
	}

	var name = node.name;
	parts.unshift(name);

	return { name: name, keypath: parts.join('.') };
};
function polyfill(options) {
	if(!options) { throw new Error('Missing options'); }
	var filter = pluginutils.createFilter(options.include, options.exclude);
	var modules = options.modules;
	var modulesMap = new Map();
	var membersMap = new Map();

	var coreJsConfig = options['core-js'];
	if(coreJsConfig) {
		require("./build/core-js")(coreJsConfig, membersMap, modulesMap);
	}
	var skyCoreConfig = options['sky-core'];
	if(skyCoreConfig) {
		require("./build/sky-core")(skyCoreConfig, membersMap, modulesMap);
	}
	if(modules) {
		Object.entries(modules).forEach(function([key, value]) {
			//console.log(key);
			if(key.startsWith(".")) {
				membersMap.set(key, value);
			} else {
				modulesMap.set(key, value);
			}
		});
	}

	var sourceMap = options.sourceMap !== false && options.sourcemap !== false;
	return {
		name: "polyfill",
		transform(code, id) {
			if(!filter(id)) { return null; }
			var ast = null;
			try {
				ast = this.parse(code);
			} catch(err) {
				this.warn({
					code: 'PARSE_ERROR',
					message: ("rollup-plugin-inject: failed to parse " + id + ". Consider restricting the plugin to particular files via options.include")
				});
			}
			if(!ast) {
				return null;
			}
			//console.log(JSON.stringify(ast, null, 1));
			var imports = new Set();
			ast.body.forEach(function(node) {
				if(node.type === 'ImportDeclaration') {
					node.specifiers.forEach(function(specifier) {
						//console.log(specifier.local.name);
						imports.add(specifier.local.name);
					});
				}
			});
			// analyse scopes
			var scope = pluginutils.attachScopes(ast, 'scope');
			var magicString = new MagicString(code);
			var newImports = new Set();

			function handleReference(node, name, keypath) {
				membersMap.forEach(function(mod, key) {
					if(keypath.endsWith(key)) {
						if(Array.isArray(mod)) {
							mod.forEach(function(mod) {
								newImports.add(mod);
							});
						} else {
							newImports.add(mod);
						}
					}
				});
				modulesMap.forEach(function(mod, path) {
					if(mod && !imports.has(name) && !scope.contains(name)) {
						if(path === keypath && !scope.contains(name)) {
							if(Array.isArray(mod)) {
								mod.forEach(function(mod) {
									newImports.add(mod);
								});
							} else {
								newImports.add(mod);
							}
						}
					}
				});
				return false;
			}

			estreeWalker.walk(ast, {
				enter: function enter(node, parent) {
					//console.log(node);
					if(sourceMap) {
						magicString.addSourcemapLocation(node.start);
						magicString.addSourcemapLocation(node.end);
					}
					if(node.scope) {
						scope = node.scope; // eslint-disable-line prefer-destructuring
					}
					// special case – shorthand properties. because node.key === node.value,
					// we can't differentiate once we've descended into the node
					if(node.type === 'Property' && node.shorthand) {
						var ref = node.key;
						var name = ref.name;
						handleReference(node, name, name);
						this.skip();
						return;
					}
					if(node.type === 'ImportExpression') {
						handleReference(node, "import", "import");
						this.skip();
						return;
					}
					if(isReference(node, parent)) {
						var { name, keypath } = flatten(node);
						var handled = handleReference(node, name, keypath);
						if(handled) {
							this.skip();
						}
					}
				},
				leave: function leave(node) {
					if(node.scope) {
						scope = scope.parent;
					}
				}
			});
			if(newImports.size === 0) {
				return {
					code: code,
					ast: ast,
					map: sourceMap ? magicString.generateMap({ hires: true }) : null
				};
			}
			var importBlock = Array.from(newImports).filter(mod => !imports.has(mod)).map(item => `import "${item}";`).join('\n');
			//console.log(importBlock);
			magicString.prepend((importBlock + "\n\n"));

			return {
				code: magicString.toString(),
				map: sourceMap ? magicString.generateMap({ hires: true }) : null
			};
		}
	};
}
polyfill.default = polyfill;
polyfill.__esModule = true;
module.exports = polyfill;
