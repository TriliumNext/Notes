# Links
## External links

An external link is a standard web link targeting for example a website. For example, [https://en.wikipedia.org/wiki/South\_China\_Sea](https://en.wikipedia.org/wiki/South_China_Sea) is an external link to a Wikipedia page.

To create a link without a custom text:

*   Press <img src="2_Links_image.png" width="15" height="16"> in the <a class="reference-link" href="Formatting%20toolbar.md">Formatting toolbar</a>:
    *   A popup will appear, type or paste the URL in the box.
    *   Press <kbd>Enter</kbd> or the check mark icon to confirm.
*   Alternatively, press <kbd>Ctrl</kbd>+<kbd>K</kbd> to trigger the aforementioned popup.
*   A simpler way is to paste the raw link and press space to turn it automatically into a link.

To create a link with a custom text:

*   First, type and select the text which will be turned into a link.
*   Follow the previous steps to open the link interface (via the formatting toolbar, or <kbd>Ctrl</kbd>+<kbd>K</kbd>).
*   Alternatively, simply paste (<kbd>Ctrl</kbd>+<kbd>V</kbd>) over the selected text to turn it into a link.

Once a link is inserted:

*   The text inside the link can be changed if needed but the link itself will remain.
*   To modify the link, click on the link to display the popup and press the <img src="Links_image.png" width="18" height="18"> _Edit link_ button.
*   To remove a link, click on it and press the <img src="3_Links_image.png" width="18" height="18"> _Unlink_ button.

You can follow external link by either double clicking (will open new tab/window) it or right clicking on them and choosing "Open in new tab".

## Internal links to notes

Unlike external notes, internal links (links to other notes) can be created at the current position by :

1.  Pressing <kbd>Ctrl</kbd> + <kbd>L</kbd> or the <img src="1_Links_image.png" width="20" height="17"> button from the <a class="reference-link" href="Formatting%20toolbar.md">Formatting toolbar</a>.
2.  Filling in the desired note to link. It's also possible to create notes from this dialog by typing a non-existing note title and selecting _Create and link child note_.

There are two link types, adjustable when creating the link to the note:

1.  _link title mirrors the note's current title_
    1.  This is sometimes also called "reference link".
    2.  Title of such links cannot be changed, instead it is always mirroring the title of linked note.
    3.  The icon of the note is also displayed.
    4.  The link title will automatically update if the title of the note is changed.
2.  _link title can be changed arbitrarily_
    1.  This is the traditional hyperlink, where the text of the link can be different to the note title.

Once an internal link is created:

*   You can follow the note link by double clicking it.
*   Alternatively if you only wish to quickly preview the content, you can hover over the link and will see read only preview.

## Pasting links

*   For internal links (links to notes in Trilium), press Ctrl+C in the <a class="reference-link" href="../../Basic%20Concepts%20and%20Features/UI%20Elements/Note%20Tree.md">Note Tree</a>:
    *   Pasting directly in a text note will create a reference link (with an icon to the note and the actual note title).
    *   Pasting over an existing text will create a traditional link.
*   For external links:
    *   Paste the raw URL directly and press space to turn it into a link.
    *   Select a text and paste the URL over it to turn that text into a link.
    *   If you are pasting a formatted link (e.g. from the a webpage in a browser), simply paste it and it will keep the original text and URL.

## In-place linking

Trilium also provides "inline" linking - type `@` and you'll see an autocomplete, just type few characters from the desired note title, press enter and you have a link.

## Note map

Trilium provides a visualisation of incoming and outgoing links for a particular note. See [note map](../../Advanced%20Usage/Note%20Map%20\(Link%20map%2C%20Tree%20map\).md) for details.