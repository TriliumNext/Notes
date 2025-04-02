import config from './rollup.config.js';

export default config({
	output: {
		format: 'iife',
		file: 'dist/turndown-plugin-gfm.js',
        name: 'turndownPluginGfm'
	},
});
