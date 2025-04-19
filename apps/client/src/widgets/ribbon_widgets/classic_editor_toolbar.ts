import { t } from "../../services/i18n.js";
import options from "../../services/options.js";
import utils from "../../services/utils.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = /*html*/`\
<div class="classic-toolbar-widget"></div>

<style>
    .classic-toolbar-widget {
        --ck-color-toolbar-background: transparent;
        --ck-color-button-default-background: transparent;
        --ck-color-button-default-disabled-background: transparent;
        min-height: 39px;
    }

    .classic-toolbar-widget .ck.ck-toolbar {
        border: none;
    }

    .classic-toolbar-widget .ck.ck-button.ck-disabled {
        opacity: 0.3;
    }
</style>
`;

/**
 * Handles the editing toolbar when the CKEditor is in decoupled mode.
 *
 * <p>
 * This toolbar is only enabled if the user has selected the classic CKEditor.
 *
 * <p>
 * The ribbon item is active by default for text notes, as long as they are not in read-only mode.
 */
export default class ClassicEditorToolbar extends NoteContextAwareWidget {

    get name() {
        return "classicEditor";
    }

    get toggleCommand() {
        return "toggleRibbonTabClassicEditor";
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
    }

    async getTitle() {
        return {
            show: await this.#shouldDisplay(),
            activate: true,
            title: t("classic_editor_toolbar.title"),
            icon: "bx bx-text"
        };
    }

    async #shouldDisplay() {
        if (options.get("textNoteEditorType") !== "ckeditor-classic") {
            return false;
        }

        if (!this.note || this.note.type !== "text") {
            return false;
        }

        if (await this.noteContext?.isReadOnly()) {
            return false;
        }

        return true;
    }

}
