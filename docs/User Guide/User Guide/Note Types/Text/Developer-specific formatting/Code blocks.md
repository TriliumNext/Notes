# Code blocks
![](1_Code%20blocks_image.png)

The code blocks feature allows entering pieces of code in text notes.

Note that this feature is meant for generally small snippets of code. For larger files such as an entire log, see the [Code blocks](Code%20blocks.md) note type instead.

## Inserting a code block

*   Via the [Formatting toolbar](../Formatting%20toolbar.md), look for the ![](Code%20blocks_image.png) button.
    *   Pressing directly on the icon will insert a code block with the language that was selected most recently. If this is the first time a code block is inserted, the language will be “Auto-detected” by default.
    *   Pressing the arrow next to the icon, which will show a popup with the available languages.
*   Type ` ``` ` (as in Markdown).
    *   Note that it's not possible to specify the language, as it will default to the last selected language.

## Syntax highlighting

Since TriliumNext v0.90.12, Trilium will try to offer syntax highlighting to the code block. Note that the syntax highlighting mechanism is slightly different than the one in [Code Notes](../../Code.md) notes as different technologies are involved.

When the language is set to _Auto-detected_, Trilium will try to identify the programming language (or similar) that corresponds to the given snippet of text and highlight it. If this is problematic, consider changing the language of the code block manually.

When the language is set to _Plain text_, there will be no syntax highlighting.

## Changing the language of a code block

Simply click anywhere inside the code block and press again the code block button in the [Formatting toolbar](../Formatting%20toolbar.md):  
![](2_Code%20blocks_image.png)

## Adjusting the list of languages

The code blocks feature shares the list of languages with the [Code Notes](../../Code.md) note type.

The supported languages can be adjusted by going to [Options](../../../Basic%20Concepts%20and%20Features/UI%20Elements/Options.md), then _Code Notes_ and looking for the _Available MIME types in the dropdown_ section. Simply check any of the items to add them to the list, or uncheck them to remove them from the list.

Note that the list of languages is not immediately refreshed, you'd have to manually [refresh the application](../../../Troubleshooting/Refreshing%20the%20application.md).