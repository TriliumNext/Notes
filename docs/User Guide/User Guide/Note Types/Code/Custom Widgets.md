# Custom Widgets
It's possible to create custom widget in three possible locations where you can display your custom content.

Positions are:

*   `left-pane`
*   `center-pane`
*   `note-detail-pane` - located within `center-pane`, but specific to note (split)
*   `right-pane`

## Example - word count widget

Create a code note of type JS frontend and **give it a** `**#widget**` **label**.

```
/*
 * This defines a custom widget which displays number of words and characters in a current text note.
 * To be activated for a given note, add label 'wordCount' to the note, you can also make it inheritable and thus activate it for the whole subtree.
 * 
 * See it in action in "Books" and its subtree.
 */
const TPL = `
    Word count: 
    

     

    Character count: 
    
`;

class WordCountWidget extends api.NoteContextAwareWidget {
    static get parentWidget() { return 'center-pane'; }

    get position() { return 100; } // higher value means position towards the bottom/right

    isEnabled() {
        return super.isEnabled()
            && this.note.type === 'text'
            && this.note.hasLabel('wordCount');
    }

    doRender() {
        this.$widget = $(TPL);
        this.$wordCount = this.$widget.find('.word-count');
        this.$characterCount = this.$widget.find('.character-count');
        return this.$widget;
    }

    async refreshWithNote(note) {
        const {content} = await note.getNoteComplement();

        const text = $(content).text(); // get plain text only

        const counts = this.getCounts(text);

        this.$wordCount.text(counts.words);
        this.$characterCount.text(counts.characters);
    }

    getCounts(text) {
        const chunks = text
            .split(/[\s-+:,/\\]+/)
            .filter(chunk => chunk !== '');

        let words;

        if (chunks.length === 1 && chunks[0] === '') {
            words = 0;
        }
        else {
            words = chunks.length;
        }

        const characters = chunks.join('').length;

        return {words, characters};
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            this.refresh();
        }
    }
}

module.exports = WordCountWidget;
```

After you make changes it is necessary to restart Trilium so that the layout can be rebuilt.

### Example screenshot

On the bottom you can see the resulting widget:

![](../../Attachments/Custom-widget%20image.png)