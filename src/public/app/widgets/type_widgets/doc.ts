import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import { applySyntaxHighlight } from "../../services/syntax_highlight.js";
import TypeWidget from "./type_widget.js";
import { getCurrentLanguage } from "../../services/i18n.js";

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
            padding-bottom: 15vh;
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
            max-width: 90vw;
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
        this.initialized = this.#loadContent(note);
        this.$widget.toggleClass("contextual-help", this.noteContext?.viewScope?.viewMode === "contextual-help");
    }

    #loadContent(note: FNote) {
        return new Promise<void>((resolve) => {
            let docName = note.getLabelValue("docName");

            if (docName) {
                // find doc based on language
                const url = this.#getUrl(docName, getCurrentLanguage());
                this.$content.load(url, (response, status) => {
                    // fallback to english doc if no translation available
                    if (status === "error") {
                        const fallbackUrl = this.#getUrl(docName, "en");
                        this.$content.load(fallbackUrl, () => this.#processContent(fallbackUrl));
                        resolve();
                        return;
                    }

                    this.#processContent(url);
                    resolve();
                });
            } else {
                this.$content.empty();
                resolve();
            }
        });
    }

    #getUrl(docNameValue: string, language: string) {
        // For help notes, we only get the content to avoid loading of styles and meta.
        let suffix = "";
        if (docNameValue?.startsWith("User Guide")) {
            suffix = " .content";
        }

        // Cannot have spaces in the URL due to how JQuery.load works.
        docNameValue = docNameValue.replaceAll(" ", "%20");

        return `${window.glob.appPath}/doc_notes/${language}/${docNameValue}.html${suffix}`;
    }

    #processContent(url: string) {
        const dir = url.substring(0, url.lastIndexOf("/"));

        // Remove top-level heading since it's already handled by the note title
        this.$content.find("h1").remove();

        // Images are relative to the docnote but that will not work when rendered in the application since the path breaks.
        this.$content.find("img").each((i, el) => {
            const $img = $(el);
            $img.attr("src", dir + "/" + $img.attr("src"));
        });

        applySyntaxHighlight(this.$content);
    }

    async executeWithContentElementEvent({ resolve, ntxId }: EventData<"executeWithContentElement">) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        await this.initialized;

        resolve(this.$content);
    }

}
