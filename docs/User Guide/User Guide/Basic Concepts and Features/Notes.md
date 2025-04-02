# Notes
Note is a central entity in Trilium. Main attributes of note are title and content.

### Note types

*   [text note](../Note%20Types/Text.md) - this is default note type which allows you to put rich text, images etc.
*   [code note](../Note%20Types/Code.md) - some kind of formal code, typically programming language (e.g. JavaScript) or data structure (e.g. JSON)
*   [image note](https://github.com/TriliumNext/Notes/wiki/Images) - represents single image
*   file note - represents uploaded file (e.g. docx MS Word document).
*   render HTML note - this works as an output screen of attached [scripts](../Note%20Types/Code/Scripts.md)
*   [saved search](../Note%20Types/Saved%20Search.md) note - contains saved search query and dynamically displays result of the search as its sub-notes
*   [relation map](../Note%20Types/Relation%20Map.md) note - visualizes notes and their relations
*   [book note](../Note%20Types/Book.md) - displays its children notes, useful for reading many short notes
*   mermaid - create diagrams and flowcharts using [mermaid.js ↗](https://github.com/mermaid-js/mermaid)
*   [canvas note](#root/fKYGY3OOo5d1) - allows hand drawn notes and basic diagraming on an infinite canvas using [excalidraw ↗](https://github.com/excalidraw/excalidraw)

In Trilium there's no specific "folder" note type. Any note can have children and thus be a folder.

### Root note

There's one special note called "root note" which is root of the note tree. All other notes are placed below it in the structure.

### Tree structure

Importantly, note itself doesn't carry information on its placement in note tree. See [cloning](Notes/Cloning%20Notes.md) for details.

Tree structure of notes can resemble file system - but compared to that notes in Trilium can act as both file and directory - meaning that note can both have its own content and have children. "Leaf note" is a note which doesn't have any children.

### Deleting / undeleting notes

When you delete a note in Trilium, it is actually only marked for deletion (soft-delete) - the actual content, title, attributes etc. are not deleted, only hidden.

Within (by default) 7 days, it is possible to undelete these soft-deleted notes - open Recent Changes dialog, and you will see a list of all modified notes including the deleted ones. Notes available for undeletion have a link to do so. This is kind of "trash can" functionality known from e.g. Windows.

Clicking an undelete will recover the note, it's content and attributes - note should be just as before being deleted. This action will also undelete note's children which have been deleted in the same action.

To be able to undelete a note, it is necessary that deleted note's parent must be undeleted (otherwise there's no place where we can undelete it to). This might become a problem when you delete more notes in succession - the solution is then undelete in the reverse order of your deletion.

After the 7 days (configurable) the notes will be "erased" - their title, content, revisions and attributes will be erased, and it will not be possible anymore to recover them (unless you restore [backup](../Installation%20%26%20Setup/Backup.md)).

## See also

*   [Read-only note](Notes/Read-Only%20Notes.md)