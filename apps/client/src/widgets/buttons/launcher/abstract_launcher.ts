import shortcutService from "../../../services/shortcuts.js";
import attributesService from "../../../services/attributes.js";
import OnClickButtonWidget from "../onclick_button.js";
import type FNote from "../../../entities/fnote.js";
import type FAttribute from "../../../entities/fattribute.js";
import type { EventData } from "../../../components/app_context.js";
import type { AttributeRow } from "../../../services/load_results.js";

export default abstract class AbstractLauncher extends OnClickButtonWidget {

    protected launcherNote: FNote;

    constructor(launcherNote: FNote) {
        super();

        this.class("launcher-button");

        this.launcherNote = launcherNote;

        for (const label of launcherNote.getOwnedLabels("keyboardShortcut")) {
            this.bindNoteShortcutHandler(label);
        }
    }

    abstract launch(): void;

    bindNoteShortcutHandler(labelOrRow: FAttribute | AttributeRow) {
        const namespace = labelOrRow.attributeId;

        if ("isDeleted" in labelOrRow && labelOrRow.isDeleted) {
            // only applicable if row
            shortcutService.removeGlobalShortcut(namespace);
        } else if (labelOrRow.value) {
            shortcutService.bindGlobalShortcut(labelOrRow.value, () => this.launch(), namespace);
        }
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        for (const attr of loadResults.getAttributeRows()) {
            if (attr.noteId === this.launcherNote.noteId && attr.type === "label" && attr.name === "keyboardShortcut") {
                this.bindNoteShortcutHandler(attr);
            } else if (attr.type === "label" && attr.name === "iconClass" && attributesService.isAffecting(attr, this.launcherNote)) {
                this.refreshIcon();
            }
        }
    }
}
