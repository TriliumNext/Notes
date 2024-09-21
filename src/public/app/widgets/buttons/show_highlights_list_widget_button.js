import OnClickButtonWidget from "./onclick_button.js";
import appContext from "../../components/app_context.js";
import attributeService from "../../services/attributes.js";
import { t } from "../../services/i18n.js";

export default class ShowHighlightsListWidgetButton extends OnClickButtonWidget {
    isEnabled() {
        return super.isEnabled()
            && this.note
            && this.note.type === 'text'
            && this.noteContext.viewScope.viewMode === 'default';
    }

    constructor() {
        super();

        this.icon("bx-highlight")
            .title(t("show_highlights_list_widget_button.show_highlights_list"))
            .titlePlacement("bottom")
            .onClick(widget => {
                this.noteContext.viewScope.highlightsListTemporarilyHidden = false;
                appContext.triggerEvent("showHighlightsListWidget", { noteId: this.noteId });
                this.toggleInt(false);
            });
    }

    async refreshWithNote(note) {
        this.toggleInt(this.noteContext.viewScope.highlightsListTemporarilyHidden);
    }
    async reEvaluateHighlightsListWidgetVisibilityEvent({ noteId }) {
        if (noteId === this.noteId) {
            await this.refresh();
        }
    }
    async entitiesReloadedEvent({ loadResults }) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            await this.refresh();
        } else if (loadResults.getAttributeRows().find(attr => attr.type === 'label'
            && (attr.name.toLowerCase().includes('readonly') || attr.name === 'hideHighlightWidget')
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
