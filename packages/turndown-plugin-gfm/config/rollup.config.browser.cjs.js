import config from './rollup.config.js';

export default config({
	output: {
		format: 'cjs',
		file: 'lib/turndown-plugin-gfm.browser.cjs.js',
	},
});
