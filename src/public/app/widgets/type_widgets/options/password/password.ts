import { t } from "../../../../services/i18n.js";
import server from "../../../../services/server.js";
import protectedSessionHolder from "../../../../services/protected_session_holder.js";
import toastService from "../../../../services/toast.js";
import OptionsWidget from "../options_widget.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4 class="password-heading">${t("password.heading")}</h4>

    <div class="alert alert-warning" role="alert" style="font-weight: bold; color: red !important;">
      ${t("password.alert_message")} <a class="reset-password-button tn-link" href="javascript:">${t("password.reset_link")}</a>
    </div>

    <form class="change-password-form">
        <div class="old-password-form-group form-group">
            <label for="old-password">${t("password.old_password")}</label>
            <input id="old-password" class="old-password form-control" type="password">
        </div>

        <div class="form-group">
            <label for="new-password1">${t("password.new_password")}</label>
            <input id="new-password1" class="new-password1 form-control" type="password">
        </div>

        <div class="form-group">
            <label for="new-password2">${t("password.new_password_confirmation")}</label>
            <input id="new-password2" class="new-password2 form-control" type="password">
        </div>

        <button class="save-password-button btn btn-primary">${t("password.change_password")}</button>
    </form>
</div>
`;

// TODO: Deduplicate
interface ChangePasswordResponse {
    success: boolean;
    message?: string;
}

export default class PasswordOptions extends OptionsWidget {

    private $passwordHeading!: JQuery<HTMLElement>;
    private $changePasswordForm!: JQuery<HTMLElement>;
    private $oldPassword!: JQuery<HTMLElement>;
    private $newPassword1!: JQuery<HTMLElement>;
    private $newPassword2!: JQuery<HTMLElement>;
    private $savePasswordButton!: JQuery<HTMLElement>;
    private $resetPasswordButton!: JQuery<HTMLElement>;
    private $protectedSessionTimeout!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$passwordHeading = this.$widget.find(".password-heading");
        this.$changePasswordForm = this.$widget.find(".change-password-form");
        this.$oldPassword = this.$widget.find(".old-password");
        this.$newPassword1 = this.$widget.find(".new-password1");
        this.$newPassword2 = this.$widget.find(".new-password2");
        this.$savePasswordButton = this.$widget.find(".save-password-button");
        this.$resetPasswordButton = this.$widget.find(".reset-password-button");

        this.$resetPasswordButton.on("click", async () => {
            if (confirm(t("password.reset_confirmation"))) {
                await server.post("password/reset?really=yesIReallyWantToResetPasswordAndLoseAccessToMyProtectedNotes");

                const options = await server.get<OptionMap>("options");
                this.optionsLoaded(options);

                toastService.showError(t("password.reset_success_message"));
            }
        });

        this.$changePasswordForm.on("submit", () => this.save());

        this.$protectedSessionTimeout = this.$widget.find(".protected-session-timeout-in-seconds");
        this.$protectedSessionTimeout.on("change", () => this.updateOption("protectedSessionTimeout", this.$protectedSessionTimeout.val()));
    }

    optionsLoaded(options: OptionMap) {
        const isPasswordSet = options.isPasswordSet === "true";

        this.$widget.find(".old-password-form-group").toggle(isPasswordSet);
        this.$passwordHeading.text(isPasswordSet ? t("password.change_password_heading") : t("password.set_password_heading"));
        this.$savePasswordButton.text(isPasswordSet ? t("password.change_password") : t("password.set_password"));
        this.$protectedSessionTimeout.val(options.protectedSessionTimeout);
    }

    save() {
        const oldPassword = this.$oldPassword.val();
        const newPassword1 = this.$newPassword1.val();
        const newPassword2 = this.$newPassword2.val();

        this.$oldPassword.val("");
        this.$newPassword1.val("");
        this.$newPassword2.val("");

        if (newPassword1 !== newPassword2) {
            toastService.showError(t("password.password_mismatch"));
            return false;
        }

        server
            .post<ChangePasswordResponse>("password/change", {
                current_password: oldPassword,
                new_password: newPassword1
            })
            .then((result) => {
                if (result.success) {
                    toastService.showError(t("password.password_changed_success"));

                    // password changed so current protected session is invalid and needs to be cleared
                    protectedSessionHolder.resetProtectedSession();
                } else if (result.message) {
                    toastService.showError(result.message);
                }
            });

        return false;
    }
}
