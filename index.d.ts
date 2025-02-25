interface PolyfillOptions {
	polluting?: Record<string, string | string[]>,
	pure?: Record<string, string | string[]>,
	getter?: Record<string, string>,
	setter?: Record<string, string>,
	filter?: (id: string) => boolean;
	include?: Array<string | RegExp> | string | RegExp;
	exclude?: Array<string | RegExp> | string | RegExp;
	sourceMap?: boolean;
}
declare module "rollup-plugin-polyfill-inject" {
	var exports: {
		(options: PolyfillOptions): any;
		default: (options: PolyfillOptions) => any;
	};
	export = exports;
}
