import { t } from "../../services/i18n.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";
import { Modal } from "bootstrap";

const TPL = /*html*/`
<div class="password-not-set-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-md" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("password_not_set.title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("password_not_set.close")}"></button>
            </div>
            <div class="modal-body">
                ${t("password_not_set.body1")}

                ${t("password_not_set.body2")}
            </div>
        </div>
    </div>
</div>
`;

export default class PasswordNoteSetDialog extends BasicWidget {

    private modal!: Modal;
    private $openPasswordOptionsButton!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.modal = Modal.getOrCreateInstance(this.$widget[0]);
        this.$openPasswordOptionsButton = this.$widget.find(".open-password-options-button");
        this.$openPasswordOptionsButton.on("click", () => {
            this.modal.hide();
            this.triggerCommand("showOptions", { section: "_optionsPassword" });
        });
    }

    showPasswordNotSetEvent() {
        utils.openDialog(this.$widget);
    }
}
