# Export as PDF
![](Export%20as%20PDF_image.png)

Screenshot of the note contextual menu indicating the “Export as PDF” option.

On the desktop application of Trilium it is possible to export a note as PDF. On the server or PWA (mobile), the option is not available due to technical constraints and it will be hidden.

To print a note, select the ![](1_Export%20as%20PDF_image.png) button to the right of the note and select _Export as PDF_.

Afterwards you will be prompted to select where to save the PDF file.

## Automatic opening of the file

When the PDF is exported, it is automatically opened with the system default application for easy preview.

Note that if you are using Linux with the GNOME desktop environment, sometimes the default application might seem incorrect (such as opening in GIMP). This is because it uses Gnome's “Recommended applications” list.

To solve this, you can change the recommended application for PDFs via this command line. First, list the available applications via `gio mime application/pdf` and then set the desired one. For example to use GNOME's Evince:

```
gio mime application/pdf
```

## Reporting issues with the rendering

Should you encounter any visual issues in the resulting PDF file (e.g. a table does not fit properly, there is cut off text, etc.) feel free to [report the issue](../../Troubleshooting/Reporting%20issues.md). In this case, it's best to offer a sample note (click on the ![](1_Export%20as%20PDF_image.png) button, select Export note → This note and all of its descendants → HTML in ZIP archive). Make sure not to accidentally leak any personal information.

## Landscape mode

When exporting to PDF, there are no customizable settings such as page orientation, size, etc. However, it is possible to specify a given note to be printed as a PDF in landscape mode by adding the `#printLandscape` attribute to it (see <a class="reference-link" href="../../Advanced%20Usage/Attributes.md">Attributes</a>).

## Page size

By default, the resulting PDF will be in Letter format. It is possible to adjust it to another page size via the `#printPageSize` attribute, with one of the following values: `A0`, `A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `Legal`, `Letter`, `Tabloid`, `Ledger`.

## Keyboard shortcut

It's possible to trigger the export to PDF from the keyboard by going to _Keyboard shortcuts_ in <a class="reference-link" href="../UI%20Elements/Options.md">Options</a> and assigning a key combination for the `exportAsPdf` action.