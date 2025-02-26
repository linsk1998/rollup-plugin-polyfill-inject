
const estreeWalker = require('estree-walker');
const MagicString = require('magic-string');
const pluginutils = require('@rollup/pluginutils');
const pascalcase = require('pascalcase');

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

	return {
		name: name,
		property: parts.at(-1),
		keypath: parts.join('.')
	};
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
			var setterImports = new Map();
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
			var modified = false;
			var scopeIndex = 0;

			function prependModule(scopeName, mod) {
				if(Array.isArray(mod)) {
					let [source, imported] = mod;
					if(imported === scopeName) {
						magicString.appendLeft(0, `import { ${scopeName} } from ${JSON.stringify(source)};\n`);
					} else {
						magicString.appendLeft(0, `import { ${imported} as ${scopeName} } from ${JSON.stringify(source)};\n`);
					}
				} else {
					magicString.appendLeft(0, `import ${scopeName} from ${JSON.stringify(mod)};\n`);
				}
			}
			function generateUidIdentifier(scope, name) {
				let baseName = pluginutils.makeLegalIdentifier(name);
				scopeName = baseName;
				while(imports.has(scopeName) || scope.contains(scopeName)) {
					scopeName = `${baseName}${scopeIndex}`;
					scopeIndex++;
				}
				return scopeName;
			}
			function handleReference(node, name, keypath, property) {
				if(!imports.has(name) && !scope.contains(name)) {
					{
						let mod = getter[keypath];
						if(mod) {
							let scopeName = getterImports.get(keypath);
							if(!scopeName) {
								scopeName = generateUidIdentifier(scope, `get${pascalcase(property)}`);
								getterImports.set(keypath, scopeName);
							}
							prependModule(scopeName, mod);
							if(node.type === 'Property') {
								magicString.appendRight(node.end, ': ' + scopeName + '()');
							} else {
								magicString.overwrite(node.start, node.end, scopeName + '()');
							}
							modified = true;
							return true;
						}
					}
					{
						let mod = pure[keypath];
						if(mod) {
							let scopeName = pureImports.get(keypath);
							if(!scopeName) {
								if(name !== keypath || name == 'import') {
									scopeName = generateUidIdentifier(scope, property);
								} else {
									scopeName = name;
								}
								prependModule(scopeName, mod);
								pureImports.set(keypath, scopeName);
							}
							if(name !== keypath) {
								magicString.overwrite(node.start, node.end, scopeName, { storeName: true });
							}
							modified = true;
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
							modified = true;
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
							scopeName = generateUidIdentifier(scope, `get${pascalcase(name)}`);
							prependModule(scopeName, mod);
							getterImports.set(key, scopeName);
						}
						magicString.appendRight(member.start, `${scopeName}(`);
						magicString.overwrite(member.object.end, member.end, ")");
						modified = true;
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
						modified = true;
						return true;
					}
				}
				return false;
			}
			function handleMethod(node, callee, name) {
				let key = '.' + name;
				let mod = pure[key];
				if(mod) {
					let scopeName = pureImports.get(key);
					if(!scopeName) {
						scopeName = generateUidIdentifier(scope, name);
						prependModule(scopeName, mod);
						pureImports.set(key, scopeName);
					}
					magicString.appendRight(node.start, `${scopeName}(`);
					let args = node.arguments;
					if(args.length) {
						magicString.overwrite(callee.object.end, args[0].start, ", ");
					} else {
						magicString.overwrite(callee.object.end, node.end, ")");
					}
					modified = true;
					return true;
				}
				return false;
			}
			function handleSetter(node, name, keypath, property) {
				let mod = setter[keypath];
				if(mod) {
					let scopeName = setterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateUidIdentifier(scope, `set${pascalcase(property)}`);
						prependModule(scopeName, mod);
						setterImports.set(keypath, scopeName);
					}
					modified = true;
					return scopeName;
				}
			}
			function handleSetter2(node, property) {
				let keypath = '.' + property;
				let mod = setter[keypath];
				if(mod) {
					let scopeName = setterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateUidIdentifier(scope, `set${pascalcase(property)}`);
						prependModule(scopeName, mod);
						setterImports.set(keypath, scopeName);
					}
					modified = true;
					return scopeName;
				}
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
						handleReference(node, 'import', 'import', 'dynamicImport');
						this.skip();
						return;
					}
					// special case – shorthand properties. because node.key === node.value,
					// we can't differentiate once we've descended into the node
					if(node.type === 'Property' && node.shorthand) {
						let ref = node.key;
						let name = ref.name;
						handleReference(node, name, name, name);
						this.skip();
						return;
					}
					if(isReference(node, parent)) {
						let { name, keypath, property } = flatten(node);
						if(parent.type === 'AssignmentExpression' && parent.left === node) {
							if(parent.operator === '=') {
								let handled = handleSetter(node, name, keypath, property);
								if(handled) {
									magicString.overwrite(parent.start, parent.right.start, handled + '(');
									magicString.appendLeft(parent.right.end, ')');
									this.skip();
									return;
								}
							}
						} else {
							let handled = handleReference(node, name, keypath, property);
							if(handled) {
								this.skip();
								return;
							}
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
								handleMethod(node, callee, property.name);
							}
						}
					} else if(node.type === 'AssignmentExpression') {
						let left = node.left;
						if(left.type === 'MemberExpression' && !left.computed) {
							let property = left.property;
							if(property.type === 'Identifier') {
								if(node.operator === '=') {
									let handled = handleSetter2(left, property.name);
									if(handled) {
										magicString.appendRight(left.start, `${scopeName}(`);
										magicString.overwrite(left.object.end, node.right.start, ", ");
										magicString.appendLeft(node.right.end, ')');
										return;
									}
								}
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
			if(modified) {
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
