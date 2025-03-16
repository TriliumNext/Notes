# Events
[Script](Scripts.md) notes can be triggered by events. Note that these are backend events and thus relation need to point to the "JS backend" code note.

## Global events

Global events are attached to the script note via label. Simply create e.g. "run" label with some of these values and script note will be executed once the event occurs.

*   `run`
    *   `frontendStartup` - executes on frontend upon startup
    *   `mobileStartup` - executes on mobile frontend upon startup
    *   `backendStartup` - executes on backend upon startup
    *   `hourly` - executes once an hour on backend
    *   `daily` - executes once a day on backend

## Entity events

Other events are bound to some entity, these are defined as [relations](../../Advanced%20Usage/Attributes.md) - meaning that script is triggered only if note has this script attached to it through relations (or it can inherit it).

*   `runOnNoteCreation` - executes when note is created on backend
*   `runOnNoteTitleChange` - executes when note title is changed (includes note creation as well)
*   `runOnNoteContentChange` - executes when note content is changed (includes note creation as well).
*   `runOnNoteChange` - executes when note is changed (includes note creation as well)
*   `runOnNoteDeletion` - executes when note is being deleted
*   `runOnBranchCreation` - executes when a branch is created. Branch is a link between parent note and child note and is created e.g. when cloning or moving note.
*   `runOnBranchChange` (since v0.62) - executes when a branch is changed - either expanded status or prefix are changed.
*   `runOnBranchDeletion` - executes when a branch is delete. Branch is a link between parent note and child note and is deleted e.g. when moving note (old branch/link is deleted).
*   `runOnChildNoteCreation` - executes when new note is created under _this_ note
*   `runOnAttributeCreation` - executes when new attribute is created under _this_ note
*   `runOnAttributeChange` - executes when attribute is changed under _this_ note