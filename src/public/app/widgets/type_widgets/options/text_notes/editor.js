import { t } from "../../../../services/i18n.js";
import utils from "../../../../services/utils.js";
import OptionsWidget from "../options_widget.js";

const TPL = `
<div class="options-section formatting-toolbar">
    <h4>${t("editing.editor_type.label")}</h4>
    
    <div>
        <label>
            <input type="radio" name="editor-type" value="ckeditor-balloon" />
            <strong>${t("editing.editor_type.floating.title")}</strong>
            - ${t("editing.editor_type.floating.description")}
        </label>
    </div>

    <div>
        <label>
            <input type="radio" name="editor-type" value="ckeditor-classic" />
            <strong>${t("editing.editor_type.fixed.title")}</strong>
            - ${t("editing.editor_type.fixed.description")}
        </label>

        <div>
            <label>
                <input type="checkbox" name="multiline-toolbar" />
                ${t("editing.editor_type.multiline-toolbar")}
            </label>
        </div>
    </div>

</div>

<style>
    .formatting-toolbar div > div {
        margin-left: 1em;
    }
</style>
`;

export default class EditorOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$body = $("body");
        this.$widget.find(`input[name="editor-type"]`).on('change', async () => {
            const newEditorType = this.$widget.find(`input[name="editor-type"]:checked`).val();
            await this.updateOption('textNoteEditorType', newEditorType);
            utils.reloadFrontendApp("editor type change");
        });
        
        this.$multilineToolbarCheckbox = this.$widget.find('input[name="multiline-toolbar"]');
        this.$multilineToolbarCheckbox.on("change", () => this.updateCheckboxOption("textNoteEditorMultilineToolbar", this.$multilineToolbarCheckbox));
    }

    async optionsLoaded(options) {
        this.$widget.find(`input[name="editor-type"][value="${options.textNoteEditorType}"]`)
                    .prop("checked", "true");
        this.setCheckboxState(this.$multilineToolbarCheckbox, options.textNoteEditorMultilineToolbar);
    }
}
