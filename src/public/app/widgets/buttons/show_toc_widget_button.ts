import OnClickButtonWidget from "./onclick_button.js";
import appContext from "../../components/app_context.js";
import attributeService from "../../services/attributes.js";
import { t } from "../../services/i18n.js";
import LoadResults from "../../services/load_results.js";
import type { AttributeRow } from "../../services/load_results.js";

export default class ShowTocWidgetButton extends OnClickButtonWidget {
    isEnabled(): boolean {
        return Boolean(super.isEnabled() && this.note && this.note.type === "text" && this.noteContext?.viewScope?.viewMode === "default");
    }

    constructor() {
        super();

        this.icon("bx-objects-horizontal-left")
            .title(t("show_toc_widget_button.show_toc"))
            .titlePlacement("bottom")
            .onClick(() => {
                if (this.noteContext?.viewScope && this.noteId) {
                    this.noteContext.viewScope.tocTemporarilyHidden = false;
                    appContext.triggerEvent("showTocWidget", { noteId: this.noteId });
                }
                this.toggleInt(false);
            });
    }

    async refreshWithNote(): Promise<void> {
        if (this.noteContext?.viewScope) {
            this.toggleInt(this.noteContext.viewScope.tocTemporarilyHidden);
        }
    }

    async reEvaluateTocWidgetVisibilityEvent({ noteId }: { noteId: string }): Promise<void> {
        if (noteId === this.noteId) {
            await this.refresh();
        }
    }

    async entitiesReloadedEvent({ loadResults }: { loadResults: LoadResults }): Promise<void> {
        if (this.noteId && loadResults.isNoteContentReloaded(this.noteId)) {
            await this.refresh();
        } else if (
            loadResults
                .getAttributeRows()
                .find((attr: AttributeRow) =>
                    attr.type === "label" &&
                    (attr.name?.toLowerCase().includes("readonly") || attr.name === "toc") &&
                    this.note &&
                    attributeService.isAffecting(attr, this.note)
                )
        ) {
            await this.refresh();
        }
    }

    async noteTypeMimeChangedEvent({ noteId }: { noteId: string }): Promise<void> {
        if (this.isNote(noteId)) {
            await this.refresh();
        }
    }
}
