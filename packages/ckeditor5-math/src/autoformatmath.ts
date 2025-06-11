import { Plugin, logWarning, blockAutoformatEditing } from 'ckeditor5';
// eslint-disable-next-line ckeditor5-rules/allow-imports-only-from-main-package-entry-point
import Math from './math.js';
import MathCommand from './mathcommand.js';
import MathUI from './mathui.js';

import type Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';

export default class AutoformatMath extends Plugin {
	public static get requires() {
		return [ Math, 'Autoformat' ] as const;
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		const editor = this.editor;

		if ( !editor.plugins.has( 'Math' ) ) {
			logWarning( 'autoformat-math-feature-missing', editor );
		}
	}

	public afterInit(): void {
		const editor = this.editor;
		const command = editor.commands.get( 'math' );

		if ( command instanceof MathCommand ) {
			const callback = () => {
				if ( !command.isEnabled ) {
					return false;
				}

				command.display = true;

				// Wait until selection is removed.
				window.setTimeout(
					() => {
						const mathUIInstance = editor.plugins.get( 'MathUI' );
						if ( mathUIInstance instanceof MathUI ) {
							mathUIInstance._showUI();
						}
					},
					50
				);
			};

			// Common LaTeX math delimiters: \(\), \[\], $$
			// Chosen based on MathJax defaults:
			// https://docs.mathjax.org/en/latest/input/tex/delimiters.html
			//
			// INFO: blockAutoformatEditing expects an Autoformat instance,
			// but works fine with any Plugin that has `isEnabled`.
			// We cast `this` accordingly.
			// Source: Only `plugin.isEnabled` is used internally in the function:
			// https://github.com/ckeditor/ckeditor5/blob/master/packages/ckeditor5-autoformat/src/blockautoformatediting.ts#L91

			blockAutoformatEditing(
				editor, this as unknown as Autoformat, /\$\$/, callback );
			blockAutoformatEditing(
				editor, this as unknown as Autoformat, /\\\(/, callback );
			blockAutoformatEditing(
				editor, this as unknown as Autoformat, /\\\[/, callback );
		}
	}

	public static get pluginName() {
		return 'AutoformatMath' as const;
	}
}
