import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = `
<div class="relation-map-buttons">
    <style>
        .relation-map-buttons {
            display: flex;
            gap: 10px;
        }
    </style>

    <button type="button"
            class="relation-map-create-child-note floating-button btn bx bx-folder-plus"
            title="${t('relation_map_buttons.create_child_note_title')}"></button>
    
    <button type="button"
            class="relation-map-reset-pan-zoom floating-button btn bx bx-crop"
            title="${t('relation_map_buttons.reset_pan_zoom_title')}"></button>
    
    <div class="btn-group">
        <button type="button"
                class="relation-map-zoom-in floating-button btn bx bx-zoom-in"
                title="${t('relation_map_buttons.zoom_in_title')}"></button>
    
        <button type="button"
                class="relation-map-zoom-out floating-button btn bx bx-zoom-out"
                title="${t('relation_map_buttons.zoom_out_title')}"></button>
    </div>
</div>`;

export default class RelationMapButtons extends NoteContextAwareWidget {
    isEnabled() {
        return super.isEnabled() && this.note?.type === 'relationMap';
    }

    doRender() {
        super.doRender();

        this.$widget = $(TPL);
        this.$createChildNote = this.$widget.find(".relation-map-create-child-note");
        this.$zoomInButton = this.$widget.find(".relation-map-zoom-in");
        this.$zoomOutButton = this.$widget.find(".relation-map-zoom-out");
        this.$resetPanZoomButton = this.$widget.find(".relation-map-reset-pan-zoom");

        this.$createChildNote.on('click', () => this.triggerEvent('relationMapCreateChildNote', {ntxId: this.ntxId}));
        this.$resetPanZoomButton.on('click', () => this.triggerEvent('relationMapResetPanZoom', {ntxId: this.ntxId}));

        this.$zoomInButton.on('click', () => this.triggerEvent('relationMapResetZoomIn', {ntxId: this.ntxId}));
        this.$zoomOutButton.on('click', () => this.triggerEvent('relationMapResetZoomOut', {ntxId: this.ntxId}));
        this.contentSized();
    }
}
