import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = `
<button type="button"
        class="export-svg-button"
        title="${t('svg_export_button.button_title')}">
        <span class="bx bx-export"></span>
</button>
`;

export default class SvgExportButton extends NoteContextAwareWidget {
    isEnabled() {
        return super.isEnabled()
            && [ "mermaid", "mindMap" ].includes(this.note?.type)
            && this.note.isContentAvailable()
            && this.noteContext?.viewScope.viewMode === 'default';
    }

    doRender() {
        super.doRender();

        this.$widget = $(TPL);
        this.$widget.on('click', () => this.triggerEvent('exportSvg', {ntxId: this.ntxId}));
        this.contentSized();
    }
}
