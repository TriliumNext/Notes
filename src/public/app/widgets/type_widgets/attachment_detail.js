import TypeWidget from "./type_widget.js";
import AttachmentDetailWidget from "../attachment_detail.js";
import linkService from "../../services/link.js";
import froca from "../../services/froca.js";
import utils from "../../services/utils.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="attachment-detail note-detail-printable">
    <style>
        .attachment-detail {
            padding-left: 15px;
            padding-right: 15px;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .attachment-detail .links-wrapper {
            font-size: larger;
            padding: 0 0 16px 0;
        }
        
        .attachment-detail .attachment-wrapper {
            flex-grow: 1;
        }
    </style>

    <div class="links-wrapper"></div>

    <div class="attachment-wrapper"></div>
</div>`;

export default class AttachmentDetailTypeWidget extends TypeWidget {
    static getType() {
        return "attachmentDetail";
    }

    doRender() {
        this.$widget = $(TPL);
        this.$wrapper = this.$widget.find('.attachment-wrapper');
        this.$linksWrapper = this.$widget.find('.links-wrapper');

        super.doRender();
    }

    async doRefresh(note) {
        this.$wrapper.empty();
        this.children = [];

        const $helpButton = $('<button class="attachment-help-button" type="button" data-help-page="attachments.html" title="' + t('attachment_detail.open_help_page') + '"><span class="bx bx-help-circle"></span></button>');
        utils.initHelpButtons($helpButton);

        this.$linksWrapper.empty().append(
            t('attachment_detail.owning_note'),
            await linkService.createLink(this.noteId),
            t('attachment_detail.you_can_also_open'),
            await linkService.createLink(this.noteId, {
                title: t('attachment_detail.list_of_all_attachments'),
                viewScope: {
                    viewMode: 'attachments'
                }
            }),
            $helpButton
        );

        const attachment = await froca.getAttachment(this.attachmentId, true);

        if (!attachment) {
            this.$wrapper.html("<strong>" + t('attachment_detail.attachment_deleted') + "</strong>");
            return;
        }

        const attachmentDetailWidget = new AttachmentDetailWidget(attachment, true);
        this.child(attachmentDetailWidget);

        this.$wrapper.append(attachmentDetailWidget.render());
    }

    async entitiesReloadedEvent({loadResults}) {
        const attachmentRow = loadResults.getAttachmentRows().find(att => att.attachmentId === this.attachmentId);

        if (attachmentRow?.isDeleted) {
            this.refresh(); // all other updates are handled within AttachmentDetailWidget
        }
    }

    get attachmentId() {
        return this.noteContext.viewScope.attachmentId;
    }
}
