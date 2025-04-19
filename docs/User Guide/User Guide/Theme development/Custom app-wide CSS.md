# Custom app-wide CSS
It is possible to provide a CSS file to be used regardless of the theme set by the user.

|     |     |
| --- | --- |
| ![](Custom%20app-wide%20CSS_image.png) | Start by creating a new note and changing the note type to CSS |
| ![](1_Custom%20app-wide%20CSS_image.png) | In the ribbon, press the “Owned Attributes” section and type `#appCss`. |
| ![](2_Custom%20app-wide%20CSS_image.png) | Type the desired CSS.  <br>  <br>Generally it's a good idea to append `!important` for the styles that are being changed, in order to prevent other |

## Seeing the changes

Adding a new _app CSS note_ or modifying an existing one does not immediately apply changes. To see the changes, press Ctrl+Shift+R to refresh the page first.

## Example use-case: customizing the printing stylesheet

When printing a document or exporting as PDF, it is possible to adjust the style by creating a CSS note that uses the `@media` selector.

For example, to change the font of the document from the one defined by the theme or the user to a serif one:

```
@media print {

	body {

        --main-font-family: serif !important;

        --detail-font-family: var(--main-font-family) !important;

    }

}
```