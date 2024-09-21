import { t } from "../../services/i18n.js";
import toastService from "../../services/toast.js";
import utils from "../../services/utils.js";
import appContext from "../../components/app_context.js";
import BasicWidget from "../basic_widget.js";
import shortcutService from "../../services/shortcuts.js";
import server from "../../services/server.js";

const TPL = `
<div class="markdown-import-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("markdown_import.dialog_title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>${t("markdown_import.modal_body_text")}</p>

                <textarea class="markdown-import-textarea" style="height: 340px; width: 100%"></textarea>
            </div>
            <div class="modal-footer">
                <button class="markdown-import-button btn btn-primary">${t("markdown_import.import_button")}</button>
            </div>
        </div>
    </div>
</div>`;

export default class MarkdownImportDialog extends BasicWidget {
    constructor() {
        super();

        this.lastOpenedTs = 0;
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);
        this.$importTextarea = this.$widget.find('.markdown-import-textarea');
        this.$importButton = this.$widget.find('.markdown-import-button');

        this.$importButton.on('click', () => this.sendForm());

        this.$widget.on('shown.bs.modal', () => this.$importTextarea.trigger('focus'));

        shortcutService.bindElShortcut(this.$widget, 'ctrl+return', () => this.sendForm());
    }

    async convertMarkdownToHtml(markdownContent) {
        const { htmlContent } = await server.post('other/render-markdown', { markdownContent });

        const textEditor = await appContext.tabManager.getActiveContext().getTextEditor();

        const viewFragment = textEditor.data.processor.toView(htmlContent);
        const modelFragment = textEditor.data.toModel(viewFragment);

        textEditor.model.insertContent(modelFragment, textEditor.model.document.selection);

        toastService.showMessage(t("markdown_import.import_success"));
    }

    async pasteMarkdownIntoTextEvent() {
        await this.importMarkdownInlineEvent(); // BC with keyboard shortcuts command
    }

    async importMarkdownInlineEvent() {
        if (appContext.tabManager.getActiveContextNoteType() !== 'text') {
            return;
        }

        if (utils.isElectron()) {
            const { clipboard } = utils.dynamicRequire('electron');
            const text = clipboard.readText();

            this.convertMarkdownToHtml(text);
        }
        else {
            utils.openDialog(this.$widget);
        }
    }

    async sendForm() {
        const text = this.$importTextarea.val();

        this.modal.hide();

        await this.convertMarkdownToHtml(text);

        this.$importTextarea.val('');
    }
}
