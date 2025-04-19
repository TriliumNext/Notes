# Table of contents
<figure class="image image-style-align-right"><img style="aspect-ratio:243/171;" src="Table of contents_image.png" width="243" height="171"></figure>

The table of contents appears in the <a class="reference-link" href="../../Basic%20Concepts%20and%20Features/UI%20Elements/Right%20Sidebar.md">Right Sidebar</a> automatically when there are multiple headings in a text note.

## Interaction

*   Clicking on a heading will scroll the document to the position of the heading.
*   Pressing the close button will dismiss the table of contents but it can be shown again from the <a class="reference-link" href="../../Basic%20Concepts%20and%20Features/UI%20Elements/Floating%20buttons.md">Floating buttons</a> section.

## Global configuration

In <a class="reference-link" href="#root/_hidden/_options/_optionsTextNotes">Text Notes</a> options, look for the _Table of Contents_ section and configure the minimum amount of headings that need to be present in the current note in order for the table of contents to show:

*   To always hide it, set the value to a really large number (e.g. 10000).
*   To always display it if there's at least a single heading, set the value to 1.

## Per-note configuration

Use <a class="reference-link" href="../../Advanced%20Usage/Attributes.md">Attributes</a> to configure the table of contents for a particular note:

*   `#toc=show` will show the table of contents for that note regardless of the global settings.
*   Similarly, `#toc=hide` will always hide the table of contents for that note.