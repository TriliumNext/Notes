import type FNote from "../../entities/fnote.js";
import attributes from "../../services/attributes.js";
import { t } from "../../services/i18n.js";
import OnClickButtonWidget from "../buttons/onclick_button.js";

export default class ToggleReadOnlyButton extends OnClickButtonWidget {

    private isReadOnly?: boolean;

    constructor() {
        super();

        this
            .title(() => this.isReadOnly ? t("toggle_read_only_button.unlock-editing") : t("toggle_read_only_button.lock-editing"))
            .titlePlacement("bottom")
            .icon(() => this.isReadOnly ? "bx-lock-open-alt" : "bx-lock-alt")
            .onClick(() => this.#toggleReadOnly());
    }

    #toggleReadOnly() {
        if (!this.noteId || !this.note) {
            return;
        }

        if (this.isReadOnly) {
            attributes.removeOwnedLabelByName(this.note, "readOnly");
        } else {
            attributes.setLabel(this.noteId, "readOnly");
        }
    }

    async refreshWithNote(note: FNote | null | undefined) {
        const isReadOnly = !!note?.hasLabel("readOnly");

        if (isReadOnly !== this.isReadOnly) {
            this.isReadOnly = isReadOnly;
            this.refreshIcon();
        }
    }

    isEnabled() {
        return super.isEnabled()
            && this.note?.type === "mermaid"
            && this.note?.isContentAvailable()
            && this.noteContext?.viewScope?.viewMode === "default";
    }

}
