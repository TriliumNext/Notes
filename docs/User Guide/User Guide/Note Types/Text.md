# Text
Trilium utilizes the powerful [CKEditor 5](https://ckeditor.com/ckeditor-5/) as its text editing component.

## Formatting Options

The Trilium text note interface does not display toolbars or formatting options by default. These can be accessed by:

![inline note formatting](../Attachments/text-notes-formatting-inli.png)

1.  Selecting text to bring up an inline toolbar.

![formating note block](../Attachments/text-notes-formatting-bloc.png)2\. Clicking on the block toolbar.

## Read-Only vs. Editing Mode

Text notes are usually opened in edit mode. However, they may open in read-only mode under the following circumstances:

*   The note is long and would take time to load, so it is opened in read-only mode by default for quicker access.
*   The note has a `readOnly` [label](../Advanced%20Usage/Attributes.md).

In both cases, it is possible to switch back to editable mode using the ![](Text_bx-edit-alt.svg)button at top right of page.

For more information, see [Read-Only Notes](../Basic%20Concepts/Note/Read-Only%20Notes.md).

## General Formatting

Since Trilium uses CKEditor, all of its formatting options are available here. You may use the graphical toolbar shown above, or enter formatting such as markdown markdown directly in the text. Examples include:

*   **Bold**: Type `**text**` or `__text__`
*   _Italic_: Type `*text*` or `_text_`
*   `Code`: Type \`text\`
*   ~~Strikethrough~~: Type `~~text~~`

### Lists

See [Lists](Text/Lists.md).

### Blocks

*   Block quote: Start a line with `>` followed by a space

### Multi-Line Code Blocks

To create a multi-line code block, start a line with "\`\`\`\[lang\]", for example:

```
if (1 > 2) {
    console.log("Error in the matrix");
}
```

### Headings

Create headings by starting a line with `##` for heading 2, `###` for heading 3, and so on up to heading 6. Note that `#` is reserved for the title.

### Horizontal Line

Insert a horizontal line by starting a line with `---`.

## Markdown & Autoformat

CKEditor supports a markdown-like editing experience, recognising syntax and automatically converting it to rich text.

![](Text_image.png)

Complete documentation for this feature is available in the [CKEditor documentation](https://ckeditor.com/docs/ckeditor5/latest/features/autoformat.html).

If autoformatting is not desirable, press <kbd>Ctrl</kbd> + <kbd>Z</kbd> to revert the text to its original form.

Note: The use of `#` for Heading 1 is not supported because it is reserved for the title. Start with `##` for Heading 2. More information is available [here](https://ckeditor.com/docs/ckeditor5/latest/features/headings.html#heading-levels).

## Math Support

Trilium provides math support through [KaTeX](https://katex.org/).

## Cutting Selection to Sub-Note

When editing a document that becomes too large, you can split it into sub-notes:

1.  Select the desired text and cut it to the clipboard.
2.  Create a new sub-note and name it.
3.  Paste the content from the clipboard into the sub-note.

Trilium can automate this process. Select some text within the note, and in the selection toolbar, click the scissors icon for the "cut & pasted selection to sub-note" action. The heading is automatically detected and the new sub-note is named accordingly. You can also assign a keyboard shortcut for this action. This functionality is available through the block toolbar icon.

## Including a Note

Text notes can "include" another note as a read only widget. This can be useful for e.g. including a dynamically generated chart (from scripts & "render HTML" note) or other more advanced use cases.

This functionality is available in the block toolbar icon.