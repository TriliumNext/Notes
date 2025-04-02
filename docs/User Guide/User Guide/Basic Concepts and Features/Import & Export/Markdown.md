# Markdown
Trilium Notes supports importing Markdown restricted to the [CommonMark specification](https://spec.commonmark.org/current/) (where [tables are not supported](https://github.com/TriliumNext/Notes/issues/2026))

## Import

### Clipboard import

If you want to import just a chunk of markdown from clipboard, you can do it from editor block menu:

![](../../Attachments/markdown-inline-import.gif)

### File import

You can also import Markdown files from files:

*   single markdown file (with .md extension)
*   whole tree of markdown files (packaged into [.zip](https://en.wikipedia.org/wiki/Tar_\(computing\)) archive)
    *   Markdown files need to be packaged into ZIP archive because browser can't read directories, only single files.
    *   You can use e.g. [7-zip](https://www.7-zip.org) to package directory of markdown files into the ZIP file

\[\[gifs/markdown-file-import.gif\]\]

![](../../Attachments/markdown-file-import.gif)

## Export

### Subtree export

You can export whole subtree to ZIP archive which will have directory structured modelled after subtree structure:

![](../../Attachments/markdown-export-subtree.gif)

### Single note export

If you want to export just single note without its subtree, you can do it from Note actions menu:

![](../../Attachments/markdown-export-note.gif)

### Exporting protected notes

If you want to export protected notes, enter a protected session first! This will export the notes in an unencrypted form, so if you reimport into Trilium, make sure to re-protect these notes.