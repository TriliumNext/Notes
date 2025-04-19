# Serving directly the content of a note
When accessing a shared note, Trilium will render it as a web page. Sometimes it's desirable to serve the content directly so that it can be used in a script or downloaded by the user.

| A note displayed as a web page (HTML) | A note displayed as a raw format |
| --- | --- |
| ![](1_Serving%20directly%20the%20conte.png) | ![](Serving%20directly%20the%20conte.png) |

## By adding an attribute to the note

Simply add the `#shareRaw` attribute and the note will always be rendered _raw_ when accessed from the share URL.

## By altering the URL

Append `?raw` to the URL to display a note in its raw format regardless of whether the `#shareRaw` attribute is added on the note.

![](Serving%20directly%20the%20conte.png)