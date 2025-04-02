# Read-Only Notes
Both [text](../../Note%20Types/Text.md) and [code](../../Note%20Types/Code.md) notes in Trilium can be set to read-only. When a note is in read-only mode, it is presented to the user in a non-editable view, with the option to switch to editing mode if needed.

## Setting Read-Only Mode with a Label

To set a note as read-only, add the `readOnly` [label](../../Advanced%20Usage/Attributes.md) to the note.

## Automatic Read-Only Mode

For optimization purposes, Trilium will automatically set very large notes to read-only. Displaying such lengthy notes in editing mode can slow down performance, especially when editing is unnecessary.

If you want to ensure that a specific note remains editable regardless of its size, you can add the `autoReadOnlyDisabled` [label](../../Advanced%20Usage/Attributes.md) to the note.