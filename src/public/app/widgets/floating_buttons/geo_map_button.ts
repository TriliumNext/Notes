import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = /*html*/`\
<div class="geo-map-buttons">
    <style>
        .geo-map-buttons {
            contain: none;
            display: flex;
            gap: 10px;
        }

        .leaflet-pane {
            z-index: 50;
        }
    </style>

    <button type="button"
        class="geo-map-create-child-note floating-button btn bx bx-plus-circle"
        title="${t("geo-map.create-child-note-title")}" />
</div>`;

export default class GeoMapButtons extends NoteContextAwareWidget {

    isEnabled() {
        return super.isEnabled() && this.note?.type === "geoMap";
    }

    doRender() {
        super.doRender();

        this.$widget = $(TPL);
        this.$widget.find(".geo-map-create-child-note").on("click", () => this.triggerEvent("geoMapCreateChildNote", { ntxId: this.ntxId }));
    }

}
