import { Marker, type LatLng, type LeafletMouseEvent } from "leaflet";
import type FNote from "../../entities/fnote.js";
import GeoMapWidget, { type InitCallback, type Leaflet } from "../geo_map.js";
import TypeWidget from "./type_widget.js"
import server from "../../services/server.js";
import toastService from "../../services/toast.js";
import dialogService from "../../services/dialog.js";
import type { EventData } from "../../components/app_context.js";
import { t } from "../../services/i18n.js";
import attributes from "../../services/attributes.js";
import asset_path from "../../../../services/asset_path.js";
import openContextMenu from "./geo_map_context_menu.js";
import link from "../../services/link.js";
import note_tooltip from "../../services/note_tooltip.js";

const TPL = `\
<div class="note-detail-geo-map note-detail-printable">
    <style>
        .leaflet-pane {
            z-index: 1;
        }

        .geo-map-container.placing-note {
            cursor: crosshair;
        }

        .geo-map-container .marker-pin {
            position: relative;
        }

        .geo-map-container .leaflet-div-icon {
            position: relative;
            background: transparent;
            border: 0;
            overflow: visible;
        }

        .geo-map-container .leaflet-div-icon .icon-shadow {
            position: absolute;
            top: 0;
            left: 0;
            z-index: -1;
        }

        .geo-map-container .leaflet-div-icon .bx {
            position: absolute;
            top: 3px;
            left: 2px;
            background-color: white;
            color: black;
            padding: 2px;
            border-radius: 50%;
            font-size: 17px;
        }

        .geo-map-container .leaflet-div-icon .title-label {
            display: block;
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            height: 1rem;
            color: black;
            width: 100px;
            text-align: center;
            text-overflow: ellipsis;
            text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white;
            white-space: no-wrap;
            overflow: hidden;
        }
    </style>
</div>`;

const LOCATION_ATTRIBUTE = "geolocation";
const CHILD_NOTE_ICON = "bx bx-pin";
const DEFAULT_COORDINATES: [ number, number ] = [ 3.878638227135724, 446.6630455551659 ];
const DEFAULT_ZOOM = 2;

interface MapData {
    view?: {
        center?: LatLng | [ number, number ];
        zoom?: number;
    }
}

// TODO: Deduplicate
interface CreateChildResponse {
    note: {
        noteId: string;
    }
}

type MarkerData = Record<string, Marker>;

enum State {
    Normal,
    NewNote
}

export default class GeoMapTypeWidget extends TypeWidget {

    private geoMapWidget: GeoMapWidget;
    private _state: State;
    private L!: Leaflet;
    private currentMarkerData: MarkerData;

    static getType() {
        return "geoMap";
    }

    constructor() {
        super();

        this.geoMapWidget = new GeoMapWidget("type", (L: Leaflet) => this.#onMapInitialized(L));
        this.currentMarkerData = {};
        this._state = State.Normal;

        this.child(this.geoMapWidget);
    }

    doRender() {
        this.$widget = $(TPL);
        this.$widget.append(this.geoMapWidget.render());

        super.doRender();
    }

    async #onMapInitialized(L: Leaflet) {
        this.L = L;
        const map = this.geoMapWidget.map;
        if (!map) {
            throw new Error(t("geo-map.unable-to-load-map"));
        }

        if (!this.note) {
            return;
        }

        const blob = await this.note.getBlob();

        let parsedContent: MapData = {};
        if (blob && blob.content) {
            parsedContent = JSON.parse(blob.content);
        }

        // Restore viewport position & zoom
        const center = parsedContent.view?.center ?? DEFAULT_COORDINATES;
        const zoom = parsedContent.view?.zoom ?? DEFAULT_ZOOM;
        map.setView(center, zoom);

        // Restore markers.
        await this.#reloadMarkers();

        const updateFn = () => this.spacedUpdate.scheduleUpdate();
        map.on("moveend", updateFn);
        map.on("zoomend", updateFn);
        map.on("click", (e) => this.#onMapClicked(e));
    }

    async #reloadMarkers() {
        const map = this.geoMapWidget.map;

        if (!this.note || !map) {
            return;
        }

        // Delete all existing markers
        for (const marker of Object.values(this.currentMarkerData)) {
            marker.remove();
        }

        // Add the new markers.
        this.currentMarkerData = {};
        const childNotes = await this.note.getChildNotes();
        const L = this.L;
        for (const childNote of childNotes) {
            const latLng = childNote.getAttributeValue("label", LOCATION_ATTRIBUTE);
            if (!latLng) {
                continue;
            }

            const [ lat, lng ] = latLng.split(",", 2).map((el) => parseFloat(el));
            const icon = L.divIcon({
                html: `\
                    <img class="icon" src="${asset_path}/node_modules/leaflet/dist/images/marker-icon.png" />
                    <img class="icon-shadow" src="${asset_path}/node_modules/leaflet/dist/images/marker-shadow.png" />
                    <span class="bx ${childNote.getIcon()}"></span>
                    <span class="title-label">${childNote.title}</span>`,
                iconSize: [ 25, 41 ],
                iconAnchor: [ 12, 41 ]
            })

            const marker = L.marker(L.latLng(lat, lng), {
                icon,
                draggable: true,
                autoPan: true,
                autoPanSpeed: 5,
            })
                .addTo(map)
                .on("moveend", e => {
                    this.moveMarker(childNote.noteId, (e.target as Marker).getLatLng());
                });

            marker.on("contextmenu", (e) => {
                openContextMenu(childNote.noteId, e.originalEvent);
            });

            const el = marker.getElement();
            if (el) {
                const $el = $(el);
                $el.attr("data-href", `#${childNote.noteId}`);
                note_tooltip.setupElementTooltip($($el));
            }

            this.currentMarkerData[childNote.noteId] = marker;
        }
    }

    #changeState(newState: State) {
        this._state = newState;
        this.geoMapWidget.$container.toggleClass("placing-note", newState === State.NewNote);
    }

    async #onMapClicked(e: LeafletMouseEvent) {
        if (this._state !== State.NewNote) {
            return;
        }

        toastService.closePersistent("geo-new-note");
        const title = await dialogService.prompt({ message: t("relation_map.enter_title_of_new_note"), defaultValue: t("relation_map.default_new_note_title") });

        if (title?.trim()) {
            const { note } = await server.post<CreateChildResponse>(`notes/${this.noteId}/children?target=into`, {
                title,
                content: "",
                type: "text"
            });
            attributes.setLabel(note.noteId, "iconClass", CHILD_NOTE_ICON);
            this.moveMarker(note.noteId, e.latlng);
        }

        this.#changeState(State.Normal);
    }

    async moveMarker(noteId: string, latLng: LatLng | null) {
        const value = (latLng ? [latLng.lat, latLng.lng].join(",") : "");
        await attributes.setLabel(noteId, LOCATION_ATTRIBUTE, value);
    }

    getData(): any {
        const map = this.geoMapWidget.map;
        if (!map) {
            return;
        }

        const data: MapData = {
            view: {
                center: map.getBounds().getCenter(),
                zoom: map.getZoom()
            }
        };

        return {
            content: JSON.stringify(data)
        };
    }

    async geoMapCreateChildNoteEvent({ ntxId }: EventData<"geoMapCreateChildNote">) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        toastService.showPersistent({
            icon: "plus",
            id: "geo-new-note",
            title: "New note",
            message: t("geo-map.create-child-note-instruction")
        });

        this.#changeState(State.NewNote);

        const globalKeyListener: (this: Window, ev: KeyboardEvent) => any = (e) => {
            if (e.key !== "Escape") {
                return;
            }

            this.#changeState(State.Normal);

            window.removeEventListener("keydown", globalKeyListener);
            toastService.closePersistent("geo-new-note");
        };
        window.addEventListener("keydown", globalKeyListener);
    }

    async doRefresh(note: FNote) {
        await this.geoMapWidget.refresh();
        await this.#reloadMarkers();
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        const attributeRows = loadResults.getAttributeRows();
        if (attributeRows.find((at) => at.name === LOCATION_ATTRIBUTE)) {
            this.#reloadMarkers();
        }
    }

    openGeoLocationEvent({ noteId, event }: EventData<"openGeoLocation">) {
        const marker = this.currentMarkerData[noteId];
        if (!marker) {
            return;
        }

        const latLng = this.currentMarkerData[noteId].getLatLng();
        const url = `geo:${latLng.lat},${latLng.lng}`;
        link.goToLinkExt(event, url);
    }

    deleteFromMapEvent({ noteId }: EventData<"deleteFromMap">) {
        this.moveMarker(noteId, null);
    }

}
