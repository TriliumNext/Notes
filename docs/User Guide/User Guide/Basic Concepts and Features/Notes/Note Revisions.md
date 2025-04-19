# Note Revisions
Trilium supports seamless versioning of notes by storing snapshots ("revisions") of notes at regular intervals.

## Note Revisions Snapshot Interval

Time interval of taking note snapshot is configurable in the Options -> Other dialog. This provides a tradeoff between more revisions and more data to store.

To turn off note versioning for a particular note (or subtree), add `disableVersioning` [label](../../Advanced%20Usage/Attributes.md)to the note.

## Note Revision Snapshots Limit

The limit on the number of note snapshots can be configured in the Options -> Other dialog. The note revision snapshot number limit refers to the maximum number of revisions that can be saved for each note. Where -1 means no limit, 0 means delete all revisions. You can set the maximum revisions for a single note through the `versioningLimit=X` label.

The note limit will not take effect immediately; it will only apply when the note is modified.

You can click the **Erase excess revision snapshots now** button to apply the changes immediately.

Note revisions can be accessed through the button on the right of ribbon toolbar.

![](Note%20Revisions_note-revisi.png)