# Attributes
In Trilium, attributes are key-value pairs assigned to notes, providing additional metadata or functionality. There are two primary types of attributes:

1.  **Labels**: Simple key-value text records
2.  **Relations**: Named links to other notes

These attributes play a crucial role in organizing, categorising, and enhancing the functionality of notes.

![](Attributes_image.png)

## Labels

Labels in Trilium can be used for a variety of purposes:

*   **Metadata**: Assign labels with optional values for categorization, such as `#year=1999`, `#genre="sci-fi"`, or `#author="Neal Stephenson"`
*   **Configuration**: Labels can configure advanced features or settings
*   **Scripts and Plugins**: Used to tag notes with special metadata, such as the "weight" attribute in the [Weight Tracker](Advanced%20Showcases/Weight%20Tracker.md)

Labels are also searchable, enhancing note retrieval.

### Common Labels for Advanced Configuration

*   `**disableVersioning**`: Disables automatic versioning, ideal for large, unimportant notes like script libraries
*   `**versioningLimit**`: Used to limit the number of revisions for a single note
*   `**calendarRoot**`: Marks the note as the root for [day notes](Advanced%20Showcases/Day%20Notes.md). Only one note should carry this label
*   `**archived**`: Hides notes from default search results and dialogs
*   `**excludeFromExport**`: Excludes notes and their subtrees from export operations
*   `**run**`: Specifies events to trigger scripts (e.g., `frontendStartup`, `hourly`)
*   `**runAtHour**`: Defines specific hours for scripts to run, used with `#run=hourly`
*   `**disableInclusion**`: Prevents a script from being included in parent script executions
*   `**sorted**`: Automatically sorts child notes alphabetically by title
*   `**top**`: Keeps the note at the top of its parent's list, useful with `sorted`
*   `**hidePromotedAttributes**`: Hides certain attributes in the note's display
*   `**readOnly**`: Sets the note to read-only mode, applicable to text and code notes
*   `**autoReadOnlyDisabled**`: Disables automatic read-only mode for large notes
*   `**appCss**`: Marks CSS notes used to modify Trilium’s appearance
*   `**appTheme**`: Marks full CSS themes available in Trilium's options
*   `**cssClass**`: Adds a CSS class to the note's representation in the tree
*   `**iconClass**`: Adds a CSS class to the note's icon, useful for distinguishing notes visually. See [note icons](../Basic%20Concepts/Note/Note%20Icons.md)
*   `**pageSize**`: Specifies the number of items per page in note listings
*   `**customRequestHandler**` **and** `**customResourceProvider**`: Refer to [Custom request handler](Custom%20Request%20Handler.md)
*   `**widget**`: Marks a note as a custom widget, added to Trilium's component tree
*   `**workspace**` **and related attributes**: See [Workspace](../Basic%20Concepts/Navigation/Workspace.md) for more details
*   `**searchHome**`: Specifies the parent for new search notes
*   `**inbox**`: Designates a default location for new notes created via the sidebar
*   `**sqlConsoleHome**`: Default location for SQL console notes
*   `**bookmarked**` **and** `**bookmarkFolder**`: See [Bookmarks](../Basic%20Concepts/Navigation/Bookmarks.md)
*   `**shareXXX**`: See [Sharing](Sharing.md)
*   `**keyboardShortcut**`: Assigns a keyboard shortcut to open the note
*   `**displayRelations**` **and** `**hideRelations**`: Manages the display of note relations
*   `**titleTemplate**`: See [Default note title](Default%20Note%20Title.md)
*   `**template**`: Makes the note available as a template
*   `**toc**`: Controls the visibility of the table of contents
*   `**color**`: Defines the color of the note in the tree and links
*   `**hideChildrenOverview**`: Hides child notes in the parent note's editor
*   `**viewType**`: Sets the view of child notes (grid or list)

## Relations

Relations define connections between notes, similar to links.

### Uses

*   **Metadata Relationships**: For example, linking a book note to an author note
*   **Scripting**: Attaching scripts to events or conditions related to the note

### Common Relations

*   **Event-based Relations**: Such as `runOnNoteCreation` or `runOnNoteChange`, which trigger scripts on specific actions
*   **Other Relations**: Include `template`, `renderNote`, `widget`, and sharing-related relations

## Multiplicity

Attributes in Trilium can be "multivalued", meaning multiple attributes with the same name can coexist.

## Attribute Definitions and Promoted Attributes

Special labels create "label/attribute" definitions, enhancing the organization and management of attributes. For more details, see [Promoted attributes](Attributes/Promoted%20Attributes.md).

## Attribute Inheritance

Trilium supports attribute inheritance, allowing child notes to inherit attributes from their parents. For more information, see [Attribute inheritance](Attributes/Attribute%20Inheritance.md).