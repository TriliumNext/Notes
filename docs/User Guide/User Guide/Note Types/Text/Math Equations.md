# Math Equations
<figure class="image image-style-align-right"><img style="aspect-ratio:350/193;" src="Math Equations_image.png" width="350" height="193"></figure>

Within text notes, it's possible to enter mathematical equations using the <img src="1_Math Equations_image.png" width="20" height="15"> button from the <a class="reference-link" href="Formatting%20toolbar.md">Formatting toolbar</a> (generally found under the <a class="reference-link" href="Insert%20buttons.md">Insert buttons</a>).

If inserting equations frequently, using the <kbd>Ctrl</kbd>+<kbd>M</kbd> keyboard shortcut can be more comfortable.

There is currently no quick way to insert an equation, such as surrounding it with `$` or pressing <kbd>Ctrl</kbd>+<kbd>M</kbd> on an already typed-out equation.

The mathematical expression must be written in the TeX format. There is no visual editor for the math equations, only a preview. 

Enabling _Display mode_ will render the equation slightly bigger (especially if using big operators such as summation, or fractions) and center it. Display mode equations will act as blocks (i.e. like paragraphs, or tables) and can be inserted for example in lists. Non-display equations can be part of the text.

## Supported math features

Technically we are using the KaTeX library which allows for a subset of the TeX format. To see the full list of supported features, consult the [Supported Functions](https://katex.org/docs/supported) and the [Support Table](https://katex.org/docs/support_table) from the official documentation.

## Markdown support

Math equations will be preserved when exporting to or importing from Markdown, surrounded by `\(` characters for inline math expressions, and `$\)` for display mode.

If you notice any issue with the Markdown import/export for equations, feel free to [report](../../Troubleshooting/Reporting%20issues.md) it while providing the equation that causes issues.