interface PolyfillOptions {
	/** core-js options */
	["core-js"]?: {
		version: 3,
		preset: Array<
			"ES5" |
			"ES2015" | "ES2015.Core" | "ES2015.Collection" | "ES2015.Iterable" | "ES2015.Promise" | "ES2015.Reflect" | "ES2015.Symbol" | "ES2015.Symbol.WellKnown" |
			"ES2016" | "ES2016.Array.Include" |
			"ES2017" | "ES2017.Object" | "ES2017.String" | "ES2017.TypedArrays" |
			"ES2018" | "ES2018.Promise" |
			"ES2019" | "ES2019.Array" | "ES2019.Object" | "ES2019.String" | "ES2019.Symbol" |
			"ES2020" | "ES2020.String" | "ES2020.Symbol.WellKnown" |
			"ESNext" | "ESNext.Array" | "ESNext.Intl" | "ESNext.Symbol" | "ESNext.Promise" |
			"DOM" | "DOM.Iterable" | "ES6"
		>;
	},
	modules?: Record<string, string | string[]>,
	filter?: (id: string) => boolean;
	include?: Array<string | RegExp> | string | RegExp;
	exclude?: Array<string | RegExp> | string | RegExp;
	sourceMap?: boolean
}
declare module "rollup-plugin-polyfill-inject" {
	var exports: (options: PolyfillOptions) => any
	export = exports;
}