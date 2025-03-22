# Evernote
Trilium can import ENEX files which are used by Evernote for backup/export. One ENEX file represents content (notes and resources) of one notebook.

## Export ENEX from Evernote

To export ENEX file, you need to have a _legacy_ desktop version of Evernote (i.e. not web/mobile). Right click on notebook and select export and follow the wizard.

## Import ENEX in Trilium

Once you have ENEX file, you can import it to Trilium. Right click on some note (to which you want to import the file), click on "Import" and select the ENEX file.

After importing the ENEX file, go over the imported notes and resources to be sure the import went well, and you didn't lose any data.

## Limitations

All resources (except for images) are created as note's attachments.

HTML inside ENEX files is not exactly valid so some formatting maybe broken or lost. You can report major problems into [Trilium issue tracker](https://github.com/TriliumNext/Notes/issues).