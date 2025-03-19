import NoteMapWidget from "../note_map.js";
import { t } from "../../services/i18n.js";
import RightPanelWidget from "../right_panel_widget.js";

const TPL = `
<div class="note-map-ribbon-widget">
    <style>
        .note-map-ribbon-widget {
            position: relative;
        }

        .note-map-ribbon-widget .note-map-container {
            height: 300px;
        }

        .open-full-button, .collapse-button {
            position: absolute;
            right: 5px;
            bottom: 5px;
            z-index: 1000;
        }

        .style-resolver {
            color: var(--muted-text-color);
            display: none;
        }
    </style>

    <button class="bx bx-arrow-to-bottom icon-action open-full-button" title="${t("note_map.open_full")}"></button>
    <button class="bx bx-arrow-to-top icon-action collapse-button" style="display: none;" title="${t("note_map.collapse")}"></button>

    <div class="note-map-container"></div>
</div>`;

export default class NoteMapRibbonWidget extends RightPanelWidget {

    private openState!: "small" | "full";
    private noteMapWidget: NoteMapWidget;
    private $container!: JQuery<HTMLElement>;
    private $openFullButton!: JQuery<HTMLElement>;
    private $collapseButton!: JQuery<HTMLElement>;

    constructor() {
        super();

        this.noteMapWidget = new NoteMapWidget("ribbon");
        this.child(this.noteMapWidget);
    }

    get name() {
        return "noteMap";
    }

    get toggleCommand() {
        return "toggleRibbonTabNoteMap";
    }

    get widgetTitle() {
        return t("note_map.title");
    }

    async doRenderBody() {
        this.$body.empty().append($(TPL));

        this.contentSized();
        this.$container = this.$body.find(".note-map-container");
        this.$container.append(this.noteMapWidget.render());

        this.openState = "small";

        this.$openFullButton = this.$body.find(".open-full-button");
        this.$openFullButton.on("click", () => {
            this.setFullHeight();

            this.$openFullButton.hide();
            this.$collapseButton.show();

            this.openState = "full";

            this.noteMapWidget.setDimensions();
        });

        this.$collapseButton = this.$body.find(".collapse-button");
        this.$collapseButton.on("click", () => {
            this.setSmallSize();

            this.$openFullButton.show();
            this.$collapseButton.hide();

            this.openState = "small";

            this.noteMapWidget.setDimensions();
        });

        const handleResize = () => {
            if (!this.noteMapWidget.graph) {
                // no graph has been even rendered
                return;
            }

            if (this.openState === "full") {
                this.setFullHeight();
            } else if (this.openState === "small") {
                this.setSmallSize();
            }
        };

        new ResizeObserver(handleResize).observe(this.$body[0]);
    }

    setSmallSize() {
        const SMALL_SIZE_HEIGHT = 300;
        const width = this.$body.width() ?? 0;

        this.$body.find(".note-map-container").height(SMALL_SIZE_HEIGHT).width(width);
    }

    setFullHeight() {
        const { top } = this.$body[0].getBoundingClientRect();

        const height = ($(window).height() ?? 0) - top;
        const width = (this.$body.width() ?? 0);

        this.$body.find(".note-map-container")
            .height(height)
            .width(width);
    }
}
