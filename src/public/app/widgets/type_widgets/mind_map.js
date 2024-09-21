import libraryLoader from "../../services/library_loader.js";
import TypeWidget from "./type_widget.js";
import utils from "../../services/utils.js";

const TPL = `
<div class="note-detail-mind-map note-detail-printable">
    <div class="mind-map-container">
    </div>

    <style>
        .note-detail-mind-map {
            height: 100%;
            overflow: hidden !important;
        }

        .note-detail-mind-map .mind-map-container {
            height: 100%;
        }
    </style>
</div>
`;

export default class MindMapWidget extends TypeWidget {
    static getType() { return "mindMap"; }

    doRender() {
        this.$widget = $(TPL);
        this.$content = this.$widget.find(".mind-map-container");        
        this.$content.on("keydown", (e) => {
            /*
             * Some global shortcuts interfere with the default shortcuts of the mind map,
             * as defined here: https://mind-elixir.com/docs/guides/shortcuts
             */            
            if (e.key === "F1") {
                e.stopPropagation();
            }

            // Zoom controls
            const isCtrl = e.ctrlKey && !e.altKey && !e.metaKey;
            if (isCtrl && (e.key == "-" || e.key == "=" || e.key == "0")) {
                e.stopPropagation();
            }
        });

        super.doRender();        
    }

    async doRefresh(note) {
        if (this.triggeredByUserOperation) {
            this.triggeredByUserOperation = false;
            return;
        }

        if (!window.MindElixir) {
            await libraryLoader.requireLibrary(libraryLoader.MIND_ELIXIR);
        }
        
        this.#initLibrary();
        await this.#loadData(note);   
    }

    cleanup() {
        this.triggeredByUserOperation = false;
    }
    
    async #loadData(note) {
        const blob = await note.getBlob();        
        const content = blob.getJsonContent() || MindElixir.new();
        
        this.mind.refresh(content);
        this.mind.toCenter();
    }

    #initLibrary() {
        const mind = new MindElixir({
            el: this.$content[0],
            direction: MindElixir.LEFT
        });

        this.mind = mind;
        mind.init(MindElixir.new());
        mind.bus.addListener("operation", (operation) => {
            this.triggeredByUserOperation = true;
            if (operation.name !== "beginEdit") {
                this.spacedUpdate.scheduleUpdate();
            }
        });
        
        // If the note is displayed directly after a refresh, the scroll ends up at (0,0), making it difficult for the user to see.
        // Adding an arbitrary wait until the element is attached to the DOM seems to do the trick for now.
        setTimeout(() => {
            mind.toCenter();
        }, 200);
    }

    async getData() {
        const mind = this.mind;
        if (!mind) {
            return;
        }

        const svgContent = await this.renderSvg();   
        return {
            content: mind.getDataString(),
            attachments: [
                {
                    role: "image",
                    title: "mindmap-export.svg",
                    mime: "image/svg+xml",
                    content: svgContent,
                    position: 0
                }
            ]
        };
    }

    async renderSvg() {
        return await this.mind.exportSvg().text();
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }

    async exportSvgEvent({ntxId}) {
        if (!this.isNoteContext(ntxId) || this.note.type !== "mindMap") {
            return;
        }

        const svg = await this.renderSvg();
        utils.downloadSvg(this.note.title, svg);
    }

}