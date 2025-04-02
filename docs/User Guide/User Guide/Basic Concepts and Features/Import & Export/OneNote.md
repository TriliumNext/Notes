# OneNote
**This page describes a method to migrate via EverNote Legacy, but this app is no longer available/working.**

## Prep Onenote notes for best compatibility

*   Remove Onenote Tags and replace with Emoji if possible (Onenote Tags will get imported into trilium as an image which clutters the Trilium tree somewhat)
*   Make sure to use Onenote headings where applicable (These will be carried over correctly into Trilium)
*   Remove extra whitespace in Onenote (Whitespace seems to be more noticible in Trilium, so removing it now will make it look nicer in trilium)
*   If possible, try to avoid very long Onenote pages. Trilium works best with shorter concise pages with any number of sub or (sub-sub...) pages.
*   Make sure numbered lists don't have unusual spaces between items in the list (Sometimes the numbered list will start at 1 again in Trilum if there is an extra space in the list in OneNote).

## Migration Procedure

### Import into Evernote from OneNote:

*   Install [Evernote Legacy](https://web.archive.org/web/20230327110646/https://help.evernote.com/hc/en-us/articles/360052560314). Current versions of Evernote do not have this functionality. (Requires Evernote account, but import works without internet connection - be sure to NOT sync notes to Evernote!).
*   In evernote navigate to File > Import > Onenote > Notebook > Section > OK

If exporting all sections at a time, they will not be grouped in folders - they will all be added to a single folder, but the order will be kept, so you can re-group into folders after importing to Trilium

### Export from Evernote

*   Right click on the created notebook in Evernote and choose "Export Notes…"
*   Use the default export format of .enex

### Cleanup enex file (optional)

*   If the Onenote header (that is at the top of each Onenote page) is not desired, you can use the following regex to remove them in a text editor like VsCode:
    
    Find (using regex): `.<div.*><h1` Replace with: `<h1`
    

### Import into Trilium

*   In Trilium, right click on the root node and choose Import (all default options should be fine).
*   Select the .enex file exported from Evernote
*   Be patient. Large .enex files may take a few minutes to process
*   Repeat import for each .enex file

## Other importing notes:

*   Centered text in Onenote will be left-justified after importing into Trilium
*   Internal onenote links will obviously be broken, but the link still exists so you can do a search in Trilium to find all onenote:// links and then re-link to the proper Trilium page (there is no way to link to a paragraph in trilium, so it's good to keep trilium pages short so links point to a small chunk of information instead of a massive note)
*   Text colors, highlights, and formatting generally carries over well
*   Revision history will be lost, but any new revisions will be tracked in Trilium
*   The structure of notes are not maintained exactly, so if you had sub-notes in Onenote, you may have to re-arrange the notes accordingly (This is easy since the order of the notes is preserved).
*   Evernote tags are created for each "section" in OneNote and these tags are carried over to Trilium as attributes
    *   If the tags are not desired, you can turn them off in the Evernote export options.
*   If the "Created with OneNote" text is not desired, do a find/replace in the enex files before importing to Trilium
*   Some links will be disabled (not clickable) when importing from enex.
*   Files, screenshots, and attachments are all preserved (This is the only one-note export option that seems to preserve all of these).