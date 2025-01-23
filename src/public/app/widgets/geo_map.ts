import type { Map } from "leaflet";
import library_loader from "../services/library_loader.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";

const TPL = `\
<div class="geo-map-widget">
    <style>
        .note-detail-geo-map,
        .geo-map-widget,
        .geo-map-container {
            height: 100%;
            overflow: hidden;
        }
    </style>

    <div class="geo-map-container"></div>
</div>`

export type Leaflet = typeof import("leaflet");
export type InitCallback = ((L: Leaflet) => void);

export default class GeoMapWidget extends NoteContextAwareWidget {

    map?: Map;
    $container!: JQuery<HTMLElement>;
    private initCallback?: InitCallback;

    constructor(widgetMode: "type", initCallback?: InitCallback) {
        super();
        this.initCallback = initCallback;
    }

    doRender() {
        this.$widget = $(TPL);

        this.$container = this.$widget.find(".geo-map-container");

        library_loader.requireLibrary(library_loader.LEAFLET)
            .then(async () => {
                const L = (await import("leaflet")).default;

                const map = L.map(this.$container[0], {

                });

                this.map = map;
                if (this.initCallback) {
                    this.initCallback(L);
                }

                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
            });
    }

}
