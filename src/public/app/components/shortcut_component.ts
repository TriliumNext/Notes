import appContext, { EventData, EventListener } from "./app_context.js";
import shortcutService from "../services/shortcuts.js";
import server from "../services/server.js";
import Component from "./component.js";
import froca from "../services/froca.js";
import { AttributeRow } from "../services/load_results.js";

export default class ShortcutComponent extends Component
    implements EventListener<"entitiesReloaded">
{
    constructor() {
        super();

        server.get<AttributeRow[]>('keyboard-shortcuts-for-notes').then(shortcutAttributes => {
            for (const attr of shortcutAttributes) {
                this.bindNoteShortcutHandler(attr);
            }
        });
    }

    bindNoteShortcutHandler(labelOrRow: AttributeRow) {
        const handler = () => appContext.tabManager.getActiveContext().setNote(labelOrRow.noteId);
        const namespace = labelOrRow.attributeId;

        if (labelOrRow.isDeleted) { // only applicable if row
            if (namespace) {
                shortcutService.removeGlobalShortcut(namespace);
            }
        } else if (labelOrRow.value) {
            shortcutService.bindGlobalShortcut(labelOrRow.value, handler, namespace);
        }
    }

    async entitiesReloadedEvent({loadResults}: EventData<"entitiesReloaded">) {
        for (const attr of loadResults.getAttributeRows()) {
            if (attr.type === 'label' && attr.name === 'keyboardShortcut' && attr.noteId) {
                const note = await froca.getNote(attr.noteId);
                // launcher shortcuts are handled specifically
                if (note && attr && note.type !== 'launcher') {
                    this.bindNoteShortcutHandler(attr);
                }
            }
        }
    }
}
