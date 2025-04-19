import type { EventData } from "../../components/app_context.js";
import { t } from "../../services/i18n.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";
import { Modal } from "bootstrap";
import type { ConfirmDialogCallback } from "./confirm.js";

const TPL = /*html*/`
<div class="info-dialog modal mx-auto" tabindex="-1" role="dialog" style="z-index: 2000;">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("info.modalTitle")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("info.closeButton")}"></button>
            </div>
            <div class="modal-body">
                <div class="info-dialog-content"></div>
            </div>
            <div class="modal-footer">
                <button class="info-dialog-ok-button btn btn-primary btn-sm">${t("info.okButton")}</button>
            </div>
        </div>
    </div>
</div>`;

export default class InfoDialog extends BasicWidget {

    private resolve: ConfirmDialogCallback | null;
    private modal!: bootstrap.Modal;
    private $originallyFocused!: JQuery<HTMLElement> | null;
    private $infoContent!: JQuery<HTMLElement>;
    private $okButton!: JQuery<HTMLElement>;

    constructor() {
        super();

        this.resolve = null;
        this.$originallyFocused = null; // element focused before the dialog was opened, so we can return to it afterward
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = Modal.getOrCreateInstance(this.$widget[0]);
        this.$infoContent = this.$widget.find(".info-dialog-content");
        this.$okButton = this.$widget.find(".info-dialog-ok-button");

        this.$widget.on("shown.bs.modal", () => this.$okButton.trigger("focus"));

        this.$widget.on("hidden.bs.modal", () => {
            if (this.resolve) {
                this.resolve();
            }

            if (this.$originallyFocused) {
                this.$originallyFocused.trigger("focus");
                this.$originallyFocused = null;
            }
        });

        this.$okButton.on("click", () => this.modal.hide());
    }

    showInfoDialogEvent({ message, callback }: EventData<"showInfoDialog">) {
        this.$originallyFocused = $(":focus");

        if (typeof message === "string") {
            this.$infoContent.text(message);
        } else if (Array.isArray(message)) {
            this.$infoContent.html(message[0]);
        } else {
            this.$infoContent.html(message as HTMLElement);
        }


        utils.openDialog(this.$widget);

        this.resolve = callback;
    }
}
