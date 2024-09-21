import OnClickButtonWidget from "./onclick_button.js";
import appContext from "../../components/app_context.js";
import attributeService from "../../services/attributes.js";
import { t } from "../../services/i18n.js";

export default class ShowTocWidgetButton extends OnClickButtonWidget {
    isEnabled() {
        return super.isEnabled()
            && this.note
            && this.note.type === 'text'
            && this.noteContext.viewScope.viewMode === 'default';
    }

    constructor() {
        super();

        this.icon("bx-objects-horizontal-left")
            .title(t("show_toc_widget_button.show_toc"))
            .titlePlacement("bottom")
            .onClick(widget => {
                this.noteContext.viewScope.tocTemporarilyHidden = false;
                appContext.triggerEvent("showTocWidget", { noteId: this.noteId });
                this.toggleInt(false);
            });
    }

    async refreshWithNote(note) {
        this.toggleInt(this.noteContext.viewScope.tocTemporarilyHidden);
    }
    async reEvaluateTocWidgetVisibilityEvent({ noteId }) {
        if (noteId === this.noteId) {
            await this.refresh();
        }
    }
    async entitiesReloadedEvent({ loadResults }) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            await this.refresh();
        } else if (loadResults.getAttributeRows().find(attr => attr.type === 'label'
            && (attr.name.toLowerCase().includes('readonly') || attr.name === 'toc')
            && attributeService.isAffecting(attr, this.note))) {
            await this.refresh();
        }
    }

    async noteTypeMimeChangedEvent({ noteId }) {
        if (this.isNote(noteId)) {
            await this.refresh();
        }
    }
}
