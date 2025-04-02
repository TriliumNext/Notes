# Note source
## Understanding the source code of the different notes

Internally, the structure of the content of each note is different based on the [Note Types](../Note%20Types).

For example:

*   [Text Notes](#root/_hidden/_options/_optionsTextNotes) are represented internally as HTML, using the [CKEditor](Technologies%20used/CKEditor.md) representation. Note that due to the custom plugins, some HTML elements are specific to Trilium only, for example the admonitions.
*   [Code Notes](#root/_hidden/_options/_optionsCodeNotes) are plain text and are represented internally as-is.
*   [Geo map](../Note%20Types/Geo%20map.md) notes contain only minimal information (viewport, zoom) as a JSON.
*   [Canvas](../Note%20Types/Canvas.md) notes are represented as JSON, with Trilium's own information alongside with [Excalidraw](Technologies%20used/Excalidraw.md)'s internal JSON representation format.
*   [Mind Map](../Note%20Types/Mind%20Map.md) notes are represented as JSON, with the internal format of [MindElixir](Technologies%20used/MindElixir.md).

Note that some information is also stored as [Attachments](../Attachments). For example [Canvas](../Note%20Types/Canvas.md) notes use the attachments feature to store the custom libraries, and alongside with [Mind Map](../Note%20Types/Mind%20Map.md) and other similar note types it stores an SVG representation of the content for use in other features such as including in other notes, shared notes, etc.

Here's part of the HTML representation of this note, as it's stored in the database (but prettified).

```html
<h2>
	Understanding the source code of the different notes
</h2>
<p>
	Internally, the structure of the content of each note is different based on the&nbsp;
	<a class="reference-link" href="../Note%20Types">
		Note Types
	</a>
	.
</p>
```

## Viewing the source code

It is possible to view the source code of a note by pressing the contextual menu in [Note buttons](../Basic%20Concepts%20and%20Features/UI%20Elements/Note%20buttons.md) and selecting _Note source_.

![](Note%20source_image.png)

The source code will be displayed in a new tab.

For some note types, such as text notes, the source code is also formatted in order to be more easily readable.

## Modifying the source code

It is possible to modify the source code of a note directly, however not via the _Note source_ functionality. 

To do so:

1.  Change the note type from the real note type (e.g. Canvas, Geo Type) to Code (plain text) or the corresponding format such as JSON or HTML.
2.  Confirm the warning about changing the note type.
3.  The source code will appear, make the necessary modifications.
4.  Change the note type back to the real note type.

> [!WARNING]
> Depending on the changes made, there is a risk that the note will not render properly. It's best to save a revision before making any big changes.
> 
> If the note does not render properly, modify the source code again or revert to a prior revision. Since the error handling for unexpected changes might not always be perfect, it be required to refresh the application.