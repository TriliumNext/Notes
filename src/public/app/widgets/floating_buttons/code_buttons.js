import { t } from "../../services/i18n.js";
import server from "../../services/server.js";
import ws from "../../services/ws.js";
import appContext from "../../components/app_context.js";
import toastService from "../../services/toast.js";
import treeService from "../../services/tree.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";
import keyboardActionService from "../../services/keyboard_actions.js";

const TPL = `
<div class="code-buttons-widget">
    <style>
        .code-buttons-widget {
            display: flex;
            gap: 10px;
        }
    </style>

    <button data-trigger-command="runActiveNote" class="execute-button floating-button btn" title="${t('code_buttons.execute_button_title')}">
        <span class="bx bx-run"></span>
    </button>
    
    <button class="trilium-api-docs-button floating-button btn" title="${t('code_buttons.trilium_api_docs_button_title')}">
        <span class="bx bx-help-circle"></span>
    </button>
    
    <button class="save-to-note-button floating-button btn" title="${t('code_buttons.save_to_note_button_title')}">
        <span class="bx bx-save"></span>
    </button>
</div>`;

export default class CodeButtonsWidget extends NoteContextAwareWidget {
    isEnabled() {
        return super.isEnabled()
            && this.note
            && (this.note.mime.startsWith('application/javascript')  || this.note.mime === 'text/x-sqlite;schema=trilium');
    }

    doRender() {
        this.$widget = $(TPL);
        this.$openTriliumApiDocsButton = this.$widget.find(".trilium-api-docs-button");
        this.$openTriliumApiDocsButton.on("click", () => {
            toastService.showMessage(t('code_buttons.opening_api_docs_message'));

            if (this.note.mime.endsWith("frontend")) {
                window.open("https://zadam.github.io/trilium/frontend_api/FrontendScriptApi.html", "_blank");
            }
            else {
                window.open("https://zadam.github.io/trilium/backend_api/BackendScriptApi.html", "_blank");
            }
        });

        this.$executeButton = this.$widget.find('.execute-button');
        this.$saveToNoteButton = this.$widget.find('.save-to-note-button');
        this.$saveToNoteButton.on('click', async () => {
            const {notePath} = await server.post("special-notes/save-sql-console", {sqlConsoleNoteId: this.noteId});

            await ws.waitForMaxKnownEntityChangeId();

            await appContext.tabManager.getActiveContext().setNote(notePath);

            toastService.showMessage(t('code_buttons.sql_console_saved_message', { notePath: await treeService.getNotePathTitle(notePath) }));
        });

        keyboardActionService.updateDisplayedShortcuts(this.$widget);

        this.contentSized();

        super.doRender();
    }

    async refreshWithNote(note) {
        this.$executeButton.toggle(
            note.mime.startsWith('application/javascript')
            || note.mime === 'text/x-sqlite;schema=trilium'
        );

        this.$saveToNoteButton.toggle(
            note.mime === 'text/x-sqlite;schema=trilium'
            && note.isHiddenCompletely()
        );

        this.$openTriliumApiDocsButton.toggle(note.mime.startsWith('application/javascript;env='));
    }

    async noteTypeMimeChangedEvent({noteId}) {
        if (this.isNote(noteId)) {
            await this.refresh();
        }
    }
}
