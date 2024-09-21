import { t } from "../services/i18n.js";
import libraryLoader from "../services/library_loader.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import server from "../services/server.js";
import utils from "../services/utils.js";

const TPL = `<div class="mermaid-widget">
    <style>
        .mermaid-widget {
            flex-grow: 2;
            overflow: auto;
            min-height: 200px;
            border-bottom: 1px solid var(--main-border-color);
            padding: 20px;
            margin-bottom: 10px;
            flex-basis: 0;
        }
        
        .mermaid-render {
            overflow: auto;
            height: 100%;
            text-align: center;
        }
        
        .mermaid-render svg {
            width: 95%; /* https://github.com/zadam/trilium/issues/4340 */
        }
    </style>

    <div class="mermaid-error alert alert-warning">
        <p><strong>${t('mermaid.diagram_error')}</strong></p>
        <p class="error-content"></p>
    </div>

    <div class="mermaid-render"></div>
</div>`;

let idCounter = 1;

export default class MermaidWidget extends NoteContextAwareWidget {
    isEnabled() {
        return super.isEnabled()
            && this.note?.type === 'mermaid'
            && this.note.isContentAvailable()
            && this.noteContext?.viewScope.viewMode === 'default';
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
        this.$display = this.$widget.find('.mermaid-render');
        this.$errorContainer = this.$widget.find(".mermaid-error");
        this.$errorMessage = this.$errorContainer.find(".error-content");
    }

    async refreshWithNote(note) {
        this.$errorContainer.hide();

        await libraryLoader.requireLibrary(libraryLoader.MERMAID);

        const documentStyle = window.getComputedStyle(document.documentElement);
        const mermaidTheme = documentStyle.getPropertyValue('--mermaid-theme');

        mermaid.mermaidAPI.initialize({
            startOnLoad: false,
            theme: mermaidTheme.trim(),
            securityLevel: 'antiscript',
            flow: { useMaxWidth: false },
            sequence: { useMaxWidth: false },
            gantt: { useMaxWidth: false },
            "class": { useMaxWidth: false },
            state: { useMaxWidth: false },
            pie: { useMaxWidth: true },
            journey: { useMaxWidth: false },
            git: { useMaxWidth: false },
        });

        this.$display.empty();

        const wheelZoomLoaded = libraryLoader.requireLibrary(libraryLoader.WHEEL_ZOOM);

        this.$errorContainer.hide();

        try {
            const svg = await this.renderSvg();

            if (this.dirtyAttachment) {
                const payload = {
                    role: 'image',
                    title: 'mermaid-export.svg',
                    mime: 'image/svg+xml',
                    content: svg,
                    position: 0
                };

                server.post(`notes/${this.noteId}/attachments?matchBy=title`, payload).then(() => {
                    this.dirtyAttachment = false;
                });
            }

            this.$display.html(svg);

            await wheelZoomLoaded;

            this.$display.attr("id", `mermaid-render-${idCounter}`);

            WZoom.create(`#mermaid-render-${idCounter}`, {
                type: 'html',
                maxScale: 50,
                speed: 1.3,
                zoomOnClick: false
            });
        } catch (e) {
            this.$errorMessage.text(e.message);
            this.$errorContainer.show();
        }
    }

    async renderSvg() {
        idCounter++;

        const blob = await this.note.getBlob();
        const content = blob.content || "";

        const {svg} = await mermaid.mermaidAPI.render(`mermaid-graph-${idCounter}`, content);
        return svg;
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            this.dirtyAttachment = true;

            await this.refresh();
        }
    }

    async exportSvgEvent({ntxId}) {
        if (!this.isNoteContext(ntxId) || this.note.type !== "mermaid") {
            return;
        }

        const svg = await this.renderSvg();
        utils.downloadSvg(this.note.title, svg);
    }
}
