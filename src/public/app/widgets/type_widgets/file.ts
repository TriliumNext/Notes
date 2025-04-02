import openService from "../../services/open.js";
import TypeWidget from "./type_widget.js";
import { t } from "../../services/i18n.js";
import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";

const TEXT_MAX_NUM_CHARS = 5000;

const TPL = /*html*/`
<div class="note-detail-file note-detail-printable">
    <style>
        .type-file .note-detail {
            height: 100%;
        }

        .note-detail-file {
            padding: 10px;
            height: 100%;
        }

        .note-split.full-content-width .note-detail-file {
            padding: 0;
        }

        .note-split.full-content-width .note-detail-file[data-preview-type="video"] {
            overflow: hidden;
        }

        .file-preview-content {
            background-color: var(--accented-background-color);
            padding: 15px;
            height: 100%;
            overflow: auto;
            margin: 10px;
        }

        .note-detail-file > .video-preview {
            width: 100%;
            height: 100%;
        }
    </style>

    <div class="file-preview-too-big alert alert-info hidden-ext">
        ${t("file.too_big", { maxNumChars: TEXT_MAX_NUM_CHARS })}
    </div>

    <pre class="file-preview-content"></pre>

    <div class="file-preview-not-available alert alert-info">
        ${t("file.file_preview_not_available")}
    </div>

    <iframe class="pdf-preview" style="width: 100%; height: 100%; flex-grow: 100;"></iframe>

    <video class="video-preview" controls></video>

    <audio class="audio-preview" controls></audio>
</div>`;

export default class FileTypeWidget extends TypeWidget {

    private $previewContent!: JQuery<HTMLElement>;
    private $previewNotAvailable!: JQuery<HTMLElement>;
    private $previewTooBig!: JQuery<HTMLElement>;
    private $pdfPreview!: JQuery<HTMLElement>;
    private $videoPreview!: JQuery<HTMLElement>;
    private $audioPreview!: JQuery<HTMLElement>;

    static getType() {
        return "file";
    }

    doRender() {
        this.$widget = $(TPL);
        this.$previewContent = this.$widget.find(".file-preview-content");
        this.$previewNotAvailable = this.$widget.find(".file-preview-not-available");
        this.$previewTooBig = this.$widget.find(".file-preview-too-big");
        this.$pdfPreview = this.$widget.find(".pdf-preview");
        this.$videoPreview = this.$widget.find(".video-preview");
        this.$audioPreview = this.$widget.find(".audio-preview");

        super.doRender();
    }

    async doRefresh(note: FNote) {
        this.$widget.show();

        const blob = await this.note?.getBlob();

        this.$previewContent.empty().hide();
        this.$pdfPreview.attr("src", "").empty().hide();
        this.$previewNotAvailable.hide();
        this.$previewTooBig.addClass("hidden-ext");
        this.$videoPreview.hide();
        this.$audioPreview.hide();

        let previewType: string;

        if (blob?.content) {
            this.$previewContent.show().scrollTop(0);
            const trimmedContent = blob.content.substring(0, TEXT_MAX_NUM_CHARS);
            if (trimmedContent.length !== blob.content.length) {
                this.$previewTooBig.removeClass("hidden-ext");
            }
            this.$previewContent.text(trimmedContent);
            previewType = "text";
        } else if (note.mime === "application/pdf") {
            this.$pdfPreview.show().attr("src", openService.getUrlForDownload(`api/notes/${this.noteId}/open`));
            previewType = "pdf";
        } else if (note.mime.startsWith("video/")) {
            this.$videoPreview
                .show()
                .attr("src", openService.getUrlForDownload(`api/notes/${this.noteId}/open-partial`))
                .attr("type", this.note?.mime ?? "")
                .css("width", this.$widget.width() ?? 0);
            previewType = "video";
        } else if (note.mime.startsWith("audio/")) {
            this.$audioPreview
                .show()
                .attr("src", openService.getUrlForDownload(`api/notes/${this.noteId}/open-partial`))
                .attr("type", this.note?.mime ?? "")
                .css("width", this.$widget.width() ?? 0);
            previewType = "audio";
        } else {
            this.$previewNotAvailable.show();
            previewType = "not-available";
        }

        this.$widget.attr("data-preview-type", previewType ?? "");
    }

    async entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }
}
