import protectedSessionService from "../../services/protected_session.js";
import TypeWidget from "./type_widget.js";
import { t } from "../../services/i18n.js";

const TPL = /*html*/`
<div class="protected-session-password-component note-detail-printable">
    <style>
    .protected-session-password-component {
        width: 300px;
        margin: 30px auto auto;
    }

    .protected-session-password-component input,
    .protected-session-password-component button {
        margin-top: 12px;
    }

    </style>

    <form class="protected-session-password-form">
        <div class="form-group">
            <label for="protected-session-password-in-detail">${t("protected_session.enter_password_instruction")}</label>
            <input id="protected-session-password-in-detail" class="form-control protected-session-password" type="password" autofocus autocomplete="current-password">
        </div>

        <button class="btn btn-primary">${t("protected_session.start_session_button")}</button>
    </form>
</div>`;

export default class ProtectedSessionTypeWidget extends TypeWidget {

    private $passwordForm!: JQuery<HTMLElement>;
    private $passwordInput!: JQuery<HTMLElement>;

    static getType() {
        return "protectedSession";
    }

    doRender() {
        this.$widget = $(TPL);
        this.$passwordForm = this.$widget.find(".protected-session-password-form");
        this.$passwordInput = this.$widget.find(".protected-session-password");

        this.$passwordForm.on("submit", () => {
            const password = String(this.$passwordInput.val());
            this.$passwordInput.val("");

            protectedSessionService.setupProtectedSession(password);

            return false;
        });

        super.doRender();
    }
}
