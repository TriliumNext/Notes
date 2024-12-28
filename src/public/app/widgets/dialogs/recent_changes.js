import { formatDateTime } from "../../utils/formatters.js"
import { t } from "../../services/i18n.js";
import appContext from "../../components/app_context.js";
import BasicWidget from "../basic_widget.js";
import dialogService from "../../services/dialog.js";
import froca from "../../services/froca.js";
import hoistedNoteService from "../../services/hoisted_note.js";
import linkService from '../../services/link.js';
import server from '../../services/server.js';
import toastService from "../../services/toast.js";
import utils from '../../services/utils.js';
import ws from "../../services/ws.js";

const TPL = `
<div class="recent-changes-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title flex-grow-1">${t('recent_changes.title')}</h5>
                <button class="erase-deleted-notes-now-button btn btn-sm" style="padding: 0 10px">${t('recent_changes.erase_notes_button')}</button>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t('recent_changes.close')}"></button>
            </div>
            <div class="modal-body">
                <div class="recent-changes-content"></div>
            </div>
        </div>
    </div>
</div>`;

export default class RecentChangesDialog extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);

        this.$content = this.$widget.find(".recent-changes-content");
        this.$eraseDeletedNotesNow = this.$widget.find(".erase-deleted-notes-now-button");
        this.$eraseDeletedNotesNow.on("click", () => {
            server.post('notes/erase-deleted-notes-now').then(() => {
                this.refresh();

                toastService.showMessage(t('recent_changes.deleted_notes_message'));
            });
        });
    }

    async showRecentChangesEvent({ ancestorNoteId }) {
        this.ancestorNoteId = ancestorNoteId;

        await this.refresh();

        utils.openDialog(this.$widget);
    }

    async refresh() {
        if (!this.ancestorNoteId) {
            this.ancestorNoteId = hoistedNoteService.getHoistedNoteId();
        }

        const recentChangesRows = await server.get(`recent-changes/${this.ancestorNoteId}`);

        // preload all notes into cache
        await froca.getNotes(recentChangesRows.map(r => r.noteId), true);

        this.$content.empty();

        if (recentChangesRows.length === 0) {
            this.$content.append(t('recent_changes.no_changes_message'));
        }

        const groupedByDate = this.groupByDate(recentChangesRows);

        for (const [dateDay, dayChanges] of groupedByDate) {
            const $changesList = $('<ul>');

            const formattedDate = formatDateTime(dateDay, "full", "none");
            const dayEl = $('<div>').append($('<b>').text(formattedDate)).append($changesList);

            for (const change of dayChanges) {
                const formattedTime = formatDateTime(change.date, "none", "short");

                let $noteLink;

                if (change.current_isDeleted) {
                    $noteLink = $("<span>");

                    $noteLink.append($("<span>")
                        .addClass("note-title")
                        .text(change.current_title)
                    );

                    if (change.canBeUndeleted) {
                        const $undeleteLink = $(`<a href="javascript:">`)
                            .text(t('recent_changes.undelete_link'))
                            .on('click', async () => {
                                const text = t('recent_changes.confirm_undelete');

                                if (await dialogService.confirm(text)) {
                                    await server.put(`notes/${change.noteId}/undelete`);

                                    this.modal.hide();

                                    await ws.waitForMaxKnownEntityChangeId();

                                    appContext.tabManager.getActiveContext().setNote(change.noteId);
                                }
                            });

                        $noteLink
                            .append(' (')
                            .append($undeleteLink)
                            .append(')');
                    }
                } else {
                    const note = await froca.getNote(change.noteId);
                    const notePath = note.getBestNotePathString();

                    if (notePath) {
                        $noteLink = await linkService.createLink(notePath, {
                            title: change.title,
                            showNotePath: true
                        });
                    } else {
                        $noteLink = $("<span>").text(note.title);
                    }
                }

                $changesList.append($('<li>')
                    .on("click", (e) => {
                        // Skip clicks on the link or deleted notes
                        if (e.target?.nodeName !== "A" && !change.current_isDeleted) {
                            // Open the current note
                            appContext.tabManager.getActiveContext().setNote(change.noteId);
                        }
                    })
                    .addClass(() => {
                        if (change.current_isDeleted) return "deleted-note";
                    })
                    .append(
                        $("<span>")
                            .text(formattedTime)
                            .attr("title", change.date)
                    )
                    .append($noteLink.addClass("note-title")));
            }

            this.$content.append(dayEl);
        }
    }

    groupByDate(rows) {
        const groupedByDate = new Map();

        for (const row of rows) {
            const dateDay = row.date.substr(0, 10);

            if (!groupedByDate.has(dateDay)) {
                groupedByDate.set(dateDay, []);
            }

            groupedByDate.get(dateDay).push(row);
        }

        return groupedByDate;
    }
}
