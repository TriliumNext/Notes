import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js"

const TPL = `\
<div class="geo-map-buttons">
    <style>
        .geo-map-buttons {
            display: flex;
            gap: 10px;
        }

        .leaflet-pane {
            z-index: 50;
        }

        .geo-map-buttons {
            contain: none;
            background: var(--main-background-color);
            box-shadow: 0px 10px 20px rgba(0, 0, 0, var(--dropdown-shadow-opacity));
            border-radius: 4px;
        }
    </style>

    <button type="button"
        class="geo-map-create-child-note floating-button btn bx bx-folder-plus"
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
