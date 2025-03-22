import { t } from "../../services/i18n.js";
import protectedSessionService from "../../services/protected_session.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";
import { Modal } from "bootstrap";

const TPL = `
<div class="protected-session-password-dialog modal mx-auto" data-backdrop="false" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-md" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title flex-grow-1">${t("protected_session_password.modal_title")}</h5>
                <button class="help-button" type="button" data-help-page="protected-notes.html" title="${t("protected_session_password.help_title")}">?</button>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("protected_session_password.close_label")}"></button>
            </div>
            <form class="protected-session-password-form">
                <div class="modal-body">
                    <label for="protected-session-password" class="col-form-label">${t("protected_session_password.form_label")}</label>
                    <input id="protected-session-password" class="form-control protected-session-password" type="password">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary">${t("protected_session_password.start_button")}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class ProtectedSessionPasswordDialog extends BasicWidget {

    private modal!: bootstrap.Modal;
    private $passwordForm!: JQuery<HTMLElement>;
    private $passwordInput!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.modal = Modal.getOrCreateInstance(this.$widget[0]);

        this.$passwordForm = this.$widget.find(".protected-session-password-form");
        this.$passwordInput = this.$widget.find(".protected-session-password");
        this.$passwordForm.on("submit", () => {
            const password = String(this.$passwordInput.val());
            this.$passwordInput.val("");

            protectedSessionService.setupProtectedSession(password);

            return false;
        });
    }

    showProtectedSessionPasswordDialogEvent() {
        utils.openDialog(this.$widget);

        this.$passwordInput.trigger("focus");
    }

    closeProtectedSessionPasswordDialogEvent() {
        this.modal.hide();
    }
}
