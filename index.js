
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
		error = {},
		exclude,
		include
	} = options;
	const Super = options.super || {};

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
			var context = this;
			//console.log(JSON.stringify(ast, null, 1));
			var newImports = new Set();
			var oldImports = new Set();
			var pureImports = new Map();
			var getterImports = new Map();
			var setterImports = new Map();
			var superImports = new Map();
			var errorImports = new Map();
			var imports = new Set();
			var scopeDefs = new Map();
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
			var scopeNodeStack = [ast];
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
			function scopeHas(name) {
				return imports.has(name) || scopeDefs.has(name) || scope.contains(name);
			}
			function generateIdentifier(name) {
				let baseName = pluginutils.makeLegalIdentifier(name);
				let scopeName = baseName;
				while(scopeHas(scopeName)) {
					scopeName = `${baseName}${scopeIndex}`;
					scopeIndex++;
				}
				return scopeName;
			}
			function addDeclaration(name) {
				let baseName = pluginutils.makeLegalIdentifier(name);
				let scopeName;
				do {
					scopeName = `${baseName}${scopeIndex}`;
					scopeIndex++;
				} while(scopeHas(scopeName));
				scopeDefs.set(scopeName, scopeNodeStack.at(-1));
				return scopeName;
			}
			function handleErrorReference(node, name, keypath, property) {
				let mod = error[keypath];
				if(mod) {
					let scopeName = errorImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`Cause${property}`);
						prependModule(scopeName, mod);
						errorImports.set(keypath, scopeName);
					}
					magicString.overwrite(node.start, node.end, scopeName);
					modified = true;
					return true;
				}
				return false;
			}
			function handleSuperReference(node, name, keypath, property) {
				let mod = Super[keypath];
				if(mod) {
					let scopeName = superImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`Super${property}`);
						prependModule(scopeName, mod);
						superImports.set(keypath, scopeName);
					}
					magicString.overwrite(node.start, node.end, scopeName);
					modified = true;
					return true;
				}
				return false;
			}
			function handleSetReference(node, name, keypath, property) {
				let mod = setter[keypath];
				if(mod) {
					let scopeName = setterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`set${pascalcase(property)}`);
						prependModule(scopeName, mod);
						setterImports.set(keypath, scopeName);
					}
					modified = true;
					return scopeName;
				}
				return null;
			}
			function handleGetReference(node, name, keypath, property) {
				let mod = getter[keypath];
				if(mod) {
					let scopeName = getterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`get${pascalcase(property)}`);
						prependModule(scopeName, mod);
						getterImports.set(keypath, scopeName);
					}
					magicString.overwrite(node.start, node.end, scopeName + '()');
					modified = true;
					return scopeName;
				}
				return null;
			}
			function handleModuleReference(node, name, keypath, property) {
				let mod = pure[keypath];
				if(mod) {
					modified = true;
					if(name !== keypath || name == 'import') {
						let scopeName = pureImports.get(keypath);
						if(!scopeName) {
							scopeName = generateIdentifier(property);
							prependModule(scopeName, mod);
							pureImports.set(keypath, scopeName);
						}
						magicString.overwrite(node.start, node.end, scopeName, { storeName: true });
						return scopeName;
					} else {
						if(!pureImports.get(keypath)) {
							prependModule(name, mod);
							pureImports.set(keypath, name);
						}
						return name;
					}
				}
				return null;
			}
			function handlePollutingReference(keypath) {
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
				return false;
			}
			function handleMember(member, node, name) {
				let key = '.' + name;
				{
					let mod = getter[key];
					if(mod) {
						let scopeName = getterImports.get(key);
						if(!scopeName) {
							scopeName = generateIdentifier(`get${pascalcase(name)}`);
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
						scopeName = generateIdentifier(name);
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
			function handleGetter(node, property) {
				let keypath = '.' + property;
				let mod = getter[keypath];
				if(mod) {
					let scopeName = getterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`get${pascalcase(property)}`);
						prependModule(scopeName, mod);
						getterImports.set(keypath, scopeName);
					}
					modified = true;
					return scopeName;
				}
				return null;
			}
			function handleSetter(node, property) {
				let keypath = '.' + property;
				let mod = setter[keypath];
				if(mod) {
					let scopeName = setterImports.get(keypath);
					if(!scopeName) {
						scopeName = generateIdentifier(`set${pascalcase(property)}`);
						prependModule(scopeName, mod);
						setterImports.set(keypath, scopeName);
					}
					modified = true;
					return scopeName;
				}
				return null;
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
					if(node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
						scopeNodeStack.push(node.body);
					}
					if(node.type === 'ImportExpression') {
						handleModuleReference(node, 'import', 'import', 'dynamicImport') || handlePollutingReference('import');
						this.skip();
						return;
					}
					// special case – shorthand properties. because node.key === node.value,
					// we can't differentiate once we've descended into the node
					if(node.type === 'Property' && node.shorthand) {
						let ref = node.key;
						let name = ref.name;
						if(!scopeHas(name)) {
							let handled = handleGetReference(node, name, name, name);
							if(handled) {
								magicString.appendRight(node.start, name + ': ');
								this.skip();
								return;
							}
							if(handleModuleReference(node, name, name, name) || handlePollutingReference(name)) {
								this.skip();
								return;
							}
						}
					}
					if(isReference(node, parent)) {
						let { name, keypath, property } = flatten(node);
						if(!scopeHas(name)) {
							if(parent.type === 'AssignmentExpression' && parent.left === node) {
								if(parent.operator === '=') {
									let handled = handleSetReference(node, name, keypath, property);
									if(handled) {
										magicString.overwrite(parent.start, parent.right.start, handled + '(');
										magicString.prependLeft(parent.right.end, ')');
										this.skip();
										return;
									}
								} else {
									let set = handleSetReference(node, name, keypath, property);
									if(set) {
										let get = handleGetReference(node, name, keypath, property);
										if(!get) {
											const msg = `no getter found in '${keypath}'`;
											context.error({ message: msg, id, pos: node.start });
											throw new Error(msg);
										}
										let tmp = addDeclaration('$');
										magicString.overwrite(parent.start, parent.left.end, `(${tmp} = ${get}(), ${tmp}`);
										magicString.prependLeft(parent.right.end, `, ${set}(${tmp}), ${tmp})`);
										this.skip();
										return;
									}
								}
							} else if(parent.type === 'UpdateExpression') {
								let set = handleSetReference(node, name, keypath, property);
								if(set) {
									let get = handleGetReference(node, name, keypath, property);
									if(!get) {
										const msg = `no getter found in '${keypath}'`;
										context.error({ message: msg, id, pos: node.start });
										throw new Error(msg);
									}
									let tmp = addDeclaration('$');
									if(parent.prefix) {
										magicString.appendRight(parent.start, `(${tmp} = ${get}(), `);
										magicString.overwrite(node.start, node.end, `${tmp}, ${set}(${tmp}), ${tmp})`);
									} else {
										let old = addDeclaration('$');
										magicString.overwrite(node.start, node.end, `(${old} = ${tmp} = ${get}(), ${tmp}`);
										magicString.prependLeft(parent.end, `, ${set}(${tmp}), ${old})`);
									}
									this.skip();
									return;
								}
							} else {
								if(parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') {
									if(parent.superClass === node) {
										let handled = handleSuperReference(node, name, keypath, property);
										if(handled) {
											this.skip();
											return;
										}
									}
								} else if(parent.type === 'NewExpression') {
									if(parent.callee === node) {
										if(parent.arguments.length > 1 || parent.arguments.length === 1 && parent.arguments[0].type === 'SpreadElement') {
											let handled = handleErrorReference(node, name, keypath, property);
											if(handled) {
												this.skip();
												return;
											}
										}
									}
								}
								if(
									handleGetReference(node, name, keypath, property) ||
									handleModuleReference(node, name, keypath, property) ||
									handlePollutingReference(keypath)
								) {
									this.skip();
									return;
								}
							}
						}
					}
					if(node.type === 'MemberExpression' && !node.computed) {
						let property = node.property;
						if(property.type === 'Identifier') {
							if(parent.type === 'AssignmentExpression' && parent.left === node) {
							} else if(parent.type === 'UpdateExpression') {
							} else {
								handleMember(node, property, property.name);
							}
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
								let object = left.object;
								if(node.operator === '=') {
									let handled = handleSetter(left, property.name);
									if(handled) {
										magicString.appendRight(left.start, `${handled}(`);
										magicString.overwrite(object.end, node.right.start, ", ");
										magicString.prependLeft(node.right.end, ')');
										return;
									}
								} else {
									let set = handleSetter(node, property.name);
									if(set) {
										let get = handleGetter(node, property.name);
										if(!get) {
											const msg = `no getter found in '.${property.name}'`;
											context.error({ message: msg, id, pos: node.start });
											throw new Error(msg);
										}
										let obj = addDeclaration('$');
										let tmp = addDeclaration('$');
										magicString.appendRight(node.start, `(${obj} = `);
										magicString.overwrite(object.end, left.end, `, ${tmp} = ${get}(${obj}), ${tmp}`);
										magicString.prependLeft(node.right.end, `, ${set}(${obj}, ${tmp}), ${tmp})`);
										return;
									}
								}
							}
						}
					} else if(node.type === 'UpdateExpression') {
						let argument = node.argument;
						if(argument.type === 'MemberExpression' && !argument.computed) {
							let property = argument.property;
							if(property.type === 'Identifier') {
								let object = argument.object;
								let set = handleSetter(node, property.name);
								if(set) {
									let get = handleGetter(node, property.name);
									if(!get) {
										const msg = `no getter found in '.${property.name}'`;
										context.error({ message: msg, id, pos: node.start });
										throw new Error(msg);
									}
									let obj = addDeclaration('$');
									let tmp = addDeclaration('$');
									if(parent.prefix) {
										magicString.overwrite(node.start, object.start, `(${obj} = `);
										magicString.overwrite(object.end, node.end, `, ${tmp} = ${get}(${obj}), ${node.operator}${tmp}, ${set}(${obj}, ${tmp}), ${tmp})`);
									} else {
										let old = addDeclaration('$');
										magicString.appendRight(node.start, `(${obj} = `);
										magicString.overwrite(object.end, argument.end, `, ${old} = ${tmp} = ${get}(${obj}), ${tmp}`);
										magicString.prependLeft(node.end, `, ${set}(${obj}, ${tmp}), ${old})`);
									}
									return;
								}
							}
						}
					}
				},
				leave: function leave(node) {
					if(node.scope) {
						scope = scope.parent;
					}
					if(scopeNodeStack.at(-1) === node.body) {
						scopeNodeStack.pop();
					}
				}
			});
			if(modified) {
				if(scopeDefs.size) {
					let map = new Map();
					scopeDefs.forEach((node, name) => {
						let names = map.get(node);
						if(!names) {
							names = [];
							map.set(node, names);
						}
						names.push(name);
					});
					map.forEach((names, node) => {
						magicString.appendLeft(node.body.length ? node.body[0].start : 0, `var ${names.join(', ')};\n`);
					});
				}
				magicString.appendLeft(0, `\n`);
				return {
					code: magicString.toString(),
					map: sourceMap ? magicString.generateMap({ hires: true }) : null
				};
			}

		}
	};
};
polyfill.default = polyfill;
module.exports = polyfill;
