# Note ID
Whereas some applications use file names to uniquely identify notes, Trilium uses the concept of Note ID.

Generally, the Note ID is a 12-character long alphanumeric sequence (including both lower and upper case letter) that is randomly generated for each new note.

## How does the import/export affect the note IDs

When notes are exported, their note ID is kept in the metadata of the export. However when they are imported back in, a new note ID is generated for all the notes. This also includes other entities that are part of the import/export process such as <a class="reference-link" href="../Basic%20Concepts%20and%20Features/Notes/Attachments.md">Attachments</a>.

## Note collisions

Since the Note ID is a fixed-width randomly generated number, due to the [pigeonhole principle](https://en.wikipedia.org/wiki/Pigeonhole_principle), there is a possibility that a newly created note will have the same ID as an existing note.

Since the note ID is alphanumeric and the length is 12 we have $62^{12}$ unique IDs. However since we are generating them randomly, we can use a collision calculator such as the one for [Nano ID](https://alex7kom.github.io/nano-nanoid-cc/?alphabet=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz&size=12&speed=1000&speedUnit=hour) to determine that we'd need to create 1000 notes per hour every hour for 9 centuries in order to have at least 1% probability of a note collision.

As such, Trilium does not take any explicit action against potential note collisions, similar to other software that makes uses of unique hashes such as [Git](https://stackoverflow.com/questions/10434326/hash-collision-in-git). If one would theoretically occur, what would most likely happen is that the existing note will be replaced by the new one.