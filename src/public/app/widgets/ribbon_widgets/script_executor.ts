import NoteContextAwareWidget from "../note_context_aware_widget.js";
import keyboardActionService from "../../services/keyboard_actions.js";
import { t } from "../../services/i18n.js";
import type FNote from "../../entities/fnote.js";

const TPL = /*html*/`
<div class="script-runner-widget">
    <style>
        .script-runner-widget {
            padding: 12px;
            color: var(--muted-text-color);
        }

        .execute-description {
            margin-bottom: 10px;
        }
    </style>

    <div class="execute-description"></div>

    <div style="display: flex; justify-content: space-around">
        <button data-trigger-command="runActiveNote" class="execute-button btn btn-sm"></button>
    </div>
</div>`;

export default class ScriptExecutorWidget extends NoteContextAwareWidget {

    private $executeButton!: JQuery<HTMLElement>;
    private $executeDescription!: JQuery<HTMLElement>;

    isEnabled() {
        return (
            super.isEnabled() &&
            this.note &&
            (this.note.mime.startsWith("application/javascript") || this.isTriliumSqlite()) &&
            (this.note.hasLabel("executeDescription") || this.note.hasLabel("executeButton"))
        );
    }

    isTriliumSqlite() {
        return this.note?.mime === "text/x-sqlite;schema=trilium";
    }

    getTitle() {
        return {
            show: this.isEnabled(),
            activate: true,
            title: this.isTriliumSqlite() ? t("script_executor.query") : t("script_executor.script"),
            icon: "bx bx-play"
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$executeButton = this.$widget.find(".execute-button");
        this.$executeDescription = this.$widget.find(".execute-description");
    }

    async refreshWithNote(note: FNote) {
        const executeTitle = note.getLabelValue("executeButton") || (this.isTriliumSqlite() ? t("script_executor.execute_query") : t("script_executor.execute_script"));

        this.$executeButton.text(executeTitle);
        this.$executeButton.attr("title", executeTitle);
        keyboardActionService.updateDisplayedShortcuts(this.$widget);

        const executeDescription = note.getLabelValue("executeDescription");

        if (executeDescription) {
            this.$executeDescription.show().html(executeDescription);
        } else {
            this.$executeDescription.empty().hide();
        }
    }
}
