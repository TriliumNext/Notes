import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import renderDoc from "../../services/doc_renderer.js";
import TypeWidget from "./type_widget.js";

const TPL = `<div class="note-detail-doc note-detail-printable">
    <style>
        .note-detail-doc-content {
            padding: 15px;
        }

        .note-detail-doc-content pre {
            background-color: var(--accented-background-color);
            border: 1px solid var(--main-border-color);
            padding: 15px;
            border-radius: 5px;
        }

        .note-detail-doc.contextual-help {
            padding-bottom: 0;
        }

        .note-detail-doc.contextual-help h2,
        .note-detail-doc.contextual-help h3,
        .note-detail-doc.contextual-help h4,
        .note-detail-doc.contextual-help h5,
        .note-detail-doc.contextual-help h6 {
            font-size: 1.25rem;
            background-color: var(--main-background-color);
            position: sticky;
            top: 0;
            z-index: 50;
            margin: 0;
            padding-bottom: 0.25em;
        }

        img {
            max-width: 100%;
            height: auto;
        }

        td img {
            max-width: 40vw;
        }

        figure.table {
            overflow: auto !important;
        }
    </style>

    <div class="note-detail-doc-content"></div>
</div>`;

export default class DocTypeWidget extends TypeWidget {

    private $content!: JQuery<HTMLElement>;

    static getType() {
        return "doc";
    }

    doRender() {
        this.$widget = $(TPL);
        this.$content = this.$widget.find(".note-detail-doc-content");

        super.doRender();
    }

    async doRefresh(note: FNote) {
        this.initialized = renderDoc(note).then(($content) => {
            this.$content.html($content.html());
        });
        this.$widget.toggleClass("contextual-help", this.noteContext?.viewScope?.viewMode === "contextual-help");
    }

    async executeWithContentElementEvent({ resolve, ntxId }: EventData<"executeWithContentElement">) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        await this.initialized;

        resolve(this.$content);
    }

}
