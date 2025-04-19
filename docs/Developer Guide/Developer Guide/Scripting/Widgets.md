# Widgets
To create a basic widget, simply create a code note with type “JS frontend”. Add the `#widget` label in order for it to be loaded at startup.

```
const template = `<div id="my-widget"><button>Click Me!</button></div>`;

class MyWidget extends api.BasicWidget {
    get position() { return 1; }
    get parentWidget() { return "left-pane" }
    
    doRender() {
        this.$widget = $(template);
        return this.$widget;
    }
}

module.exports = new MyWidget();
```

`parentWidget()` can be given the following values:

*   `left-pane` - This renders the widget on the left side of the screen where the note tree lives.
*   `center-pane` - This renders the widget in the center of the layout in the same location that notes and splits appear.
*   `note-detail-pane` - This renders the widget _with_ the note in the center pane. This means it can appear multiple times with splits.
*   `right-pane` - This renders the widget to the right of any opened notes.

* * *

Reference:

*   [https://trilium.rocks/X7pxYpiu0lgU](https://trilium.rocks/X7pxYpiu0lgU)
*   [https://github.com/zadam/trilium/wiki/Widget-Basics](https://github.com/zadam/trilium/wiki/Widget-Basics)
*   [https://github.com/zadam/trilium/wiki/Frontend-Basics](https://github.com/zadam/trilium/wiki/Frontend-Basics)