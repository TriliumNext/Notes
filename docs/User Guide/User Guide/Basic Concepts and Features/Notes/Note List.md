# Note List
When a note has one or more child notes, they will be listed at the end of the note for easy navigation.

## Configuration

*   To hide the note list for a particular note, simply apply the `hideChildrenOverview` [label](../../Advanced%20Usage/Attributes.md).
*   For some view types, such as Grid view, only a subset of notes will be displayed and pagination can be used to navigate through all of them for performance reasons. To adjust the number of notes per page, set `pageSize` to the desired number.

## View types

By default, the notes will be displayed in a grid, however there are also some other view types available.

> [!TIP]
> Generally the view type can only be changed in a <a class="reference-link" href="../../Note%20Types/Book.md">Book</a> note from the <a class="reference-link" href="../UI%20Elements/Ribbon.md">Ribbon</a>, but it can also be changed manually on any type of note using the `#viewType` attribute.

### Grid view

<figure class="image image-style-align-center"><img style="aspect-ratio:1025/655;" src="1_Note List_image.png" width="1025" height="655"></figure>

This view presents the child notes in a grid format, allowing for a more visual navigation experience.

*   For <a class="reference-link" href="../../Note%20Types/Text.md">Text</a> notes, the text can be slighly scrollable via the mouse wheel to reveal more context.
*   For <a class="reference-link" href="../../Note%20Types/Code.md">Code</a> notes, syntax highlighting is applied.
*   For <a class="reference-link" href="../../Note%20Types/File.md">File</a> notes, a preview is made available for audio, video and PDF notes.
*   If the note does not have a content, a list of its child notes will be displayed instead.

This is the default view type.

### List view

<figure class="image image-style-align-center"><img style="aspect-ratio:1013/526;" src="Note List_image.png" width="1013" height="526"></figure>

In the list view mode, each note is displayed in a single row with only the title and the icon of the note being visible by the default. By pressing the expand button it's possible to view the content of the note, as well as the children of the note (recursively).

### Calendar view

<figure class="image image-style-align-center"><img style="aspect-ratio:1090/598;" src="2_Note List_image.png" width="1090" height="598"></figure>

In the calendar view, child notes are represented as events, with a start date and optionally an end date. The view also has interaction support such as moving or creating new events. See <a class="reference-link" href="Note%20List/Calendar%20View.md">Calendar View</a> for more information.