import { formatDateTime } from "../../utils/formatters.js";
import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";
import server from "../../services/server.js";
import utils from "../../services/utils.js";
import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";

const TPL = /*html*/`
<div class="note-info-widget">
    <style>
        .note-info-widget {
            padding: 12px;
        }

        .note-info-widget-table {
            max-width: 100%;
            display: block;
            overflow-x: auto;
            white-space: nowrap;
        }

        .note-info-widget-table td, .note-info-widget-table th {
            padding: 5px;
        }

        .note-info-mime {
            max-width: 13em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    </style>

    <table class="note-info-widget-table">
        <tr>
            <th>${t("note_info_widget.note_id")}:</th>
            <td class="note-info-note-id"></td>
            <th>${t("note_info_widget.created")}:</th>
            <td class="note-info-date-created"></td>
            <th>${t("note_info_widget.modified")}:</th>
            <td class="note-info-date-modified"></td>
        </tr>
        <tr>
            <th>${t("note_info_widget.type")}:</th>
            <td>
                <span class="note-info-type"></span>
                <span class="note-info-mime"></span>
            </td>

            <th title="${t("note_info_widget.note_size_info")}">${t("note_info_widget.note_size")}:</th>
            <td colspan="3">
                <button class="btn btn-sm calculate-button" style="padding: 0px 10px 0px 10px;">
                    <span class="bx bx-calculator"></span> ${t("note_info_widget.calculate")}
                </button>
                <span class="note-sizes-wrapper">
                    <span class="note-size"></span>
                    <span class="subtree-size"></span>
                </span>
            </td>
        </tr>
    </table>
</div>
`;

// TODO: Deduplicate with server
interface NoteSizeResponse {
    noteSize: number;
}

interface SubtreeSizeResponse {
    subTreeNoteCount: number;
    subTreeSize: number;
}

interface MetadataResponse {
    dateCreated: number;
    dateModified: number;
}

export default class NoteInfoWidget extends NoteContextAwareWidget {

    private $noteId!: JQuery<HTMLElement>;
    private $dateCreated!: JQuery<HTMLElement>;
    private $dateModified!: JQuery<HTMLElement>;
    private $type!: JQuery<HTMLElement>;
    private $mime!: JQuery<HTMLElement>;
    private $noteSizesWrapper!: JQuery<HTMLElement>;
    private $noteSize!: JQuery<HTMLElement>;
    private $subTreeSize!: JQuery<HTMLElement>;
    private $calculateButton!: JQuery<HTMLElement>;

    get name() {
        return "noteInfo";
    }

    get toggleCommand() {
        return "toggleRibbonTabNoteInfo";
    }

    isEnabled() {
        return !!this.note;
    }

    getTitle() {
        return {
            show: this.isEnabled(),
            title: t("note_info_widget.title"),
            icon: "bx bx-info-circle"
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$noteId = this.$widget.find(".note-info-note-id");
        this.$dateCreated = this.$widget.find(".note-info-date-created");
        this.$dateModified = this.$widget.find(".note-info-date-modified");
        this.$type = this.$widget.find(".note-info-type");
        this.$mime = this.$widget.find(".note-info-mime");

        this.$noteSizesWrapper = this.$widget.find(".note-sizes-wrapper");
        this.$noteSize = this.$widget.find(".note-size");
        this.$subTreeSize = this.$widget.find(".subtree-size");

        this.$calculateButton = this.$widget.find(".calculate-button");
        this.$calculateButton.on("click", async () => {
            this.$noteSizesWrapper.show();
            this.$calculateButton.hide();

            this.$noteSize.empty().append($('<span class="bx bx-loader bx-spin"></span>'));
            this.$subTreeSize.empty().append($('<span class="bx bx-loader bx-spin"></span>'));

            const noteSizeResp = await server.get<NoteSizeResponse>(`stats/note-size/${this.noteId}`);
            this.$noteSize.text(utils.formatSize(noteSizeResp.noteSize));

            const subTreeResp = await server.get<SubtreeSizeResponse>(`stats/subtree-size/${this.noteId}`);

            if (subTreeResp.subTreeNoteCount > 1) {
                this.$subTreeSize.text(t("note_info_widget.subtree_size", { size: utils.formatSize(subTreeResp.subTreeSize), count: subTreeResp.subTreeNoteCount }));
            } else {
                this.$subTreeSize.text("");
            }
        });
    }

    async refreshWithNote(note: FNote) {
        const metadata = await server.get<MetadataResponse>(`notes/${this.noteId}/metadata`);

        this.$noteId.text(note.noteId);
        this.$dateCreated.text(formatDateTime(metadata.dateCreated)).attr("title", metadata.dateCreated);

        this.$dateModified.text(formatDateTime(metadata.dateModified)).attr("title", metadata.dateModified);

        this.$type.text(note.type);

        if (note.mime) {
            this.$mime.text(`(${note.mime})`);
        } else {
            this.$mime.empty();
        }

        this.$calculateButton.show();
        this.$noteSizesWrapper.hide();
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (this.noteId && (loadResults.isNoteReloaded(this.noteId) || loadResults.isNoteContentReloaded(this.noteId))) {
            this.refresh();
        }
    }
}
