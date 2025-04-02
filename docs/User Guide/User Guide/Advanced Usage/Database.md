# Database
Your Trilium data is stored in a [SQLite](https://www.sqlite.org) database which contains all notes, tree structure, metadata, and most of the configuration. The database file is named `document.db` and is stored in the application's default [Data directory](../Installation%20%26%20Setup/Data%20directory.md).

## Demo Notes

When you run Trilium for the first time, it will generate a new database containing demo notes. These notes showcase its many features, such as:

*   [Relation Map](../Note%20Types/Relation%20Map.md)
*   [Day Notes](Advanced%20Showcases/Day%20Notes.md)
*   [Weight Tracker](Advanced%20Showcases/Weight%20Tracker.md)
*   [Task Manager](Advanced%20Showcases/Task%20Manager.md)
*   [Custom CSS Themes](../Basic%20Concepts%20and%20Features/Themes.md)

### Restoring Demo Notes

There are some cases in which you may want to restore the original demo notes. For example, if you experimented with some of the more advanced features and want to see the original reference, or if you simply want to explore the latest version of the demo notes, which might showcase new features.

You can easily restore the demo notes by using Trilium's built-in import feature by importing them:

*   Download [this .zip archive](https://github.com/TriliumNext/Notes/raw/develop/db/demo.zip) with the latest version of the demo notes
*   Right click on any note in your tree under which you would like the demo notes to be imported
*   Click "Import into note"
*   Select the .zip archive to import it

## Manually Modifying the Database

Trilium provides a lot of flexibility, and with it, opportunities for advanced users to tweak it. If you need to explore or modify the database directly, you can use a tool such as [SQLite Browser](https://sqlitebrowser.org/) to work directly on the database file.

See [Manually altering the database](Database/Manually%20altering%20the%20database.md) for more information.

## How to Reset the Database

If you are experimenting with Trilium and want to return it to its original state, you can do that by deleting the current database. When you restart the application, it will generate a new database containing the original demo notes.

To delete the database, simply go to the [data directory](../Installation%20%26%20Setup/Data%20directory.md) and delete the `document.db` file (and any other files starting with `document.db`).

If you do not need to preserve any configurations that might be stored in the `config.ini` file, you can just delete all of the [data directory's](../Installation%20%26%20Setup/Data%20directory.md) contents to fully restore the application to its original state. You can also review the [configuration](Configuration%20\(config.ini%20or%20e.md) file to provide all `config.ini` values as environment variables instead.