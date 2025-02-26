
const estreeWalker = require('estree-walker');
const MagicString = require('magic-string');
const pluginutils = require('@rollup/pluginutils');

const isReference = function(node, parent) {
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

const flatten = function(startNode) {
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
	const {
		polluting = {},
		pure = {},
		getter = {},
		setter = {},
		exclude,
		include
	} = options;

	const filter = options.filter || pluginutils.createFilter(include, exclude);
	const sourceMap = options.sourceMap !== false && options.sourcemap !== false;

	return {
		name: "polyfill-inject",
		transform(code, id) {
			if(!filter(id)) { return null; }
			var ast = null;
			try {
				ast = this.parse(code);
			} catch(err) {
				this.warn({
					code: 'PARSE_ERROR',
					message: ("rollup-plugin-polyfill-inject: failed to parse " + id + ". Consider restricting the plugin to particular files via options.include")
				});
			}
			if(!ast) {
				return null;
			}
			//console.log(JSON.stringify(ast, null, 1));
			var newImports = new Set();
			var oldImports = new Set();
			var pureImports = new Map();
			var getterImports = new Map();
			var imports = new Set();
			ast.body.forEach(function(node) {
				if(node.type === 'ImportDeclaration') {
					node.specifiers.forEach(function(specifier) {
						//console.log(specifier.local.name);
						imports.add(specifier.local.name);
					});
					oldImports.add(node.source.value);
				}
			});
			// analyse scopes
			var scope = pluginutils.attachScopes(ast, 'scope');
			var magicString = new MagicString(code);
			var changed = false;
			var scopeIndex = 0;

			function handleReference(node, name, keypath) {
				if(!imports.has(name) && !scope.contains(name)) {
					{
						let mod = getter[keypath];
						if(mod) {
							let scopeName = getterImports.get(keypath);
							if(!scopeName) {
								let baseName = pluginutils.makeLegalIdentifier(`get_${keypath}`);
								scopeName = baseName;
								while(imports.has(scopeName) || scope.contains(scopeName)) {
									scopeName = `${baseName}${scopeIndex}`;
									scopeIndex++;
								}
								getterImports.set(keypath, scopeName);
							}
							if(Array.isArray(mod)) {
								magicString.appendLeft(0, `import { ${mod[1]} as ${scopeName} } from ${JSON.stringify(mod[0])};\n`);
							} else {
								magicString.appendLeft(0, `import ${scopeName} from ${JSON.stringify(mod)};\n`);
							}
							magicString.overwrite(node.start, node.end, scopeName + '()', { storeName: true });
							changed = true;
							return true;
						}
					}
					{
						let mod = pure[keypath];
						if(mod) {
							let scopeName = pureImports.get(keypath);
							if(!scopeName) {
								if(name !== keypath || name == 'import') {
									let baseName = pluginutils.makeLegalIdentifier(keypath);
									scopeName = baseName;
									while(imports.has(scopeName) || scope.contains(scopeName)) {
										scopeName = `${baseName}${scopeIndex}`;
										scopeIndex++;
									}
								} else {
									scopeName = name;
								}
								if(Array.isArray(mod)) {
									magicString.appendLeft(0, `import { ${mod[1]} as ${scopeName} } from ${JSON.stringify(mod[0])};\n`);
								} else {
									magicString.appendLeft(0, `import ${scopeName} from ${JSON.stringify(mod)};\n`);
								}
								pureImports.set(keypath, scopeName);
							}
							if(name !== keypath) {
								magicString.overwrite(node.start, node.end, scopeName, { storeName: true });
							}
							changed = true;
							return true;
						}
					}
					{
						let mod = polluting[keypath];
						if(mod) {
							if(!Array.isArray(mod)) mod = [mod];
							mod.forEach(function(mod) {
								if(!oldImports.has(mod) && !newImports.has(mod)) {
									magicString.appendLeft(0, `import ${JSON.stringify(mod)};\n`);
									newImports.add(mod);
								}
							});
							changed = true;
							return true;
						}
					}
				}
				return false;
			}
			function handleMember(member, node, name) {
				let key = '.' + name;
				{
					let mod = getter[key];
					if(mod) {
						let scopeName = getterImports.get(key);
						if(!scopeName) {
							let baseName = pluginutils.makeLegalIdentifier(`get_${name}`);
							scopeName = baseName;
							while(imports.has(scopeName) || scope.contains(scopeName)) {
								scopeName = `${baseName}${scopeIndex}`;
								scopeIndex++;
							}
							if(Array.isArray(mod)) {
								magicString.appendLeft(0, `import { ${mod[1]} as ${scopeName} } from ${JSON.stringify(mod[0])};\n`);
							} else {
								magicString.appendLeft(0, `import ${scopeName} from ${JSON.stringify(mod)};\n`);
							}
							getterImports.set(key, scopeName);
						}
						magicString.appendRight(member.start, `${scopeName}(`);
						magicString.overwrite(member.object.end, member.end, ")", { storeName: true });
						changed = true;
						return true;
					}
				}
				{
					let mod = polluting[key];
					if(mod) {
						if(!Array.isArray(mod)) mod = [mod];
						mod.forEach(function(mod) {
							if(!oldImports.has(mod) && !newImports.has(mod)) {
								magicString.appendLeft(0, `import ${JSON.stringify(mod)};\n`);
								newImports.add(mod);
							}
						});
						changed = true;
						return true;
					}
				}
				return false;
			}
			function handleMethod(node, callee, property, name) {
				let key = '.' + name;
				let mod = pure[key];
				if(mod) {
					let scopeName = pureImports.get(key);
					if(!scopeName) {
						let baseName = pluginutils.makeLegalIdentifier(name);
						scopeName = baseName;
						while(imports.has(scopeName) || scope.contains(scopeName)) {
							scopeName = `${baseName}${scopeIndex}`;
							scopeIndex++;
						}
						if(Array.isArray(mod)) {
							magicString.appendLeft(0, `import { ${mod[1]} as ${scopeName} } from ${JSON.stringify(mod[0])};\n`);
						} else {
							magicString.appendLeft(0, `import ${scopeName} from ${JSON.stringify(mod)};\n`);
						}
						pureImports.set(key, scopeName);
					}
					magicString.appendRight(node.start, `${scopeName}(`);
					let args = node.arguments;
					if(args.length) {
						magicString.overwrite(callee.object.end, args[0].start, ", ", { storeName: true });
					} else {
						magicString.overwrite(callee.object.end, node.end, ")", { storeName: true });
					}
					changed = true;
					return true;
				}
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
					if(node.type === 'ImportExpression') {
						handleReference(node, "import", "import");
						this.skip();
						return;
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
					if(isReference(node, parent)) {
						var { name, keypath } = flatten(node);
						var handled = handleReference(node, name, keypath);
						if(handled) {
							this.skip();
							return;
						}
					}
					if(node.type === 'MemberExpression' && !node.computed) {
						let property = node.property;
						if(property.type === 'Identifier') {
							handleMember(node, property, property.name);
						}
					} else if(node.type === 'CallExpression') {
						let callee = node.callee;
						if(callee.type === 'MemberExpression' && !callee.computed) {
							let property = callee.property;
							if(property.type === 'Identifier') {
								handleMethod(node, callee, property, property.name);
							}
						}
					}
				},
				leave: function leave(node) {
					if(node.scope) {
						scope = scope.parent;
					}
				}
			});
			if(changed) {
				magicString.appendLeft(0, `\n`);
				return {
					code: magicString.toString(),
					map: sourceMap ? magicString.generateMap({ hires: true }) : null
				};
			}

		}
	};
}
polyfill.default = polyfill;
module.exports = polyfill;
