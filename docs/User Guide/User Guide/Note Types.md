# Note Types
One core features of Trilium is that it supports multiple types of notes, depending on the need.

## Creating a new note with a different type via the note tree

The default note type in Trilium (e.g. when creating a new note) is <a class="reference-link" href="Note%20Types/Text.md">Text</a>, since it's for general use.

To create a new note of a different type, head to the <a class="reference-link" href="Basic%20Concepts%20and%20Features/UI%20Elements/Note%20Tree.md">Note Tree</a> and right click an existing note where to place the new one and select:

*   _Insert note after_, to put the new note underneath the one selected.
*   _Insert child note_, to insert the note as a child of the selected note.

![](Note%20Types_image.png)

## Creating a new note of a different type via add link or new tab

*   When adding a [link](Note%20Types/Text/Links.md) in a <a class="reference-link" href="Note%20Types/Text.md">Text</a> note, type the desired title of the new note and press Enter. Afterwards the type of the note will be asked.
*   Similarly, when creating a new tab, type the desired title and press Enter.

## Changing the type of a note

It is possible to change the type of a note after it has been created via the _Basic Properties_ tab in the <a class="reference-link" href="Basic%20Concepts%20and%20Features/UI%20Elements/Ribbon.md">Ribbon</a>. Note that it's generally a good idea to change the note type only if the note is empty. Can also be used to edit the [source of a note](Advanced%20Usage/Note%20source.md).

## Supported note types

The following note types are supported by Trilium:

<figure class="table" style="width:100%;"><table class="ck-table-resized"><colgroup><col style="width:29.42%;"><col style="width:70.58%;"></colgroup><thead><tr><th>Note Type</th><th>Description</th></tr></thead><tbody><tr><td><a class="reference-link" href="Note%20Types/Text.md">Text</a></td><td>The default note type, which allows for rich text formatting, images, admonitions and right-to-left support.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Code.md">Code</a></td><td>Uses a mono-space font and can be used to store larger chunks of code or plain text than a text note, and has better syntax highlighting.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Saved%20Search.md">Saved Search</a></td><td>Stores the information about a search (the search text, criteria, etc.) for later use. Can be used for quick filtering of a large amount of notes, for example. The search can easily be triggered.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Relation%20Map.md">Relation Map</a></td><td>Allows easy creation of notes and relations between them. Can be used for mainly relational data such as a family tree.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Note%20Map.md">Note Map</a></td><td>Displays the relationships between the notes, whether via relations or their hierarchical structure.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Render%20Note.md">Render Note</a></td><td>Used in&nbsp;<a class="reference-link" href="Scripting.md">Scripting</a>, it displays the HTML content of another note. This allows displaying any kind of content, provided there is a script behind it to generate it.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Book.md">Book</a></td><td><p>Displays the children of the note either as a grid, a list, or for a more specialized case: a calendar.</p><p>Generally useful for easy reading of short notes.</p></td></tr><tr><td><a class="reference-link" href="Note%20Types/Mermaid%20Diagrams.md">Mermaid Diagrams</a></td><td>Displays diagrams such as bar charts, flow charts, state diagrams, etc. Requires a bit of technical knowledge since the diagrams are written in a specialized format.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Canvas.md">Canvas</a></td><td>Allows easy drawing of sketches, diagrams, handwritten content. Uses the same technology behind <a href="https://excalidraw.com">excalidraw.com</a>.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Web%20View.md">Web View</a></td><td>Displays the content of an external web page, similar to a browser.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Mind%20Map.md">Mind Map</a></td><td>Easy for brainstorming ideas, by placing them in a hierarchical layout.</td></tr><tr><td><a class="reference-link" href="Note%20Types/Geo%20Map.md">Geo Map</a></td><td>Displays the children of the note as a geographical map, one use-case would be to plan vacations. It even has basic support for tracks. Notes can also be created from it.</td></tr><tr><td><a class="reference-link" href="Note%20Types/File.md">File</a></td><td>Represents an uploaded file such as PDFs, images, video or audio files.</td></tr></tbody></table></figure>