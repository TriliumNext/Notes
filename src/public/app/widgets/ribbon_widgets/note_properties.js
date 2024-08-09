import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = `
<div class="note-properties-widget">
    <style>
        .note-properties-widget {
            padding: 12px;
            color: var(--muted-text-color);
        }
    </style>

    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
        ${t('note_properties.this_note_was_originally_taken_from')} <a class="page-url external"></a>
    </div>
</div>`;

/**
 * TODO: figure out better name or conceptualize better.
 */
export default class NotePropertiesWidget extends NoteContextAwareWidget {
    isEnabled() {
        return this.note && !!this.note.getLabelValue('pageUrl');
    }

    getTitle() {
        return {
            show: this.isEnabled(),
            activate: true,
            title: t('note_properties.info'),
            icon: 'bx bx-info-square'
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$pageUrl = this.$widget.find('.page-url');
    }

    async refreshWithNote(note) {
        const pageUrl = note.getLabelValue('pageUrl');

        this.$pageUrl
            .attr('href', pageUrl)
            .attr('title', pageUrl)
            .text(pageUrl);
    }
}
