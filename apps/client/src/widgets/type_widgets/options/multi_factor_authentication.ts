import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";
import type { OptionMap } from "@triliumnext/commons";
import { t } from "../../../services/i18n.js";
import utils from "../../../services/utils.js";
import dialogService from "../../../services/dialog.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("multi_factor_authentication.title")}</h4>
    <p class="form-text">${t("multi_factor_authentication.description")}</p>

    <div class="col-md-6 side-checkbox">
        <label class="form-check tn-checkbox">
            <input type="checkbox" class="mfa-enabled-checkbox form-check-input" />
            ${t("multi_factor_authentication.mfa_enabled")}
        </label>
    </div>

    <hr />

    <div class="mfa-options" style="display: none;">
        <label class="form-label"><b>${t("multi_factor_authentication.mfa_method")}</b></label>
        <div role="group">
            <label class="tn-radio">
                <input class="mfa-method-radio" type="radio" name="mfaMethod" value="totp" />
                <b>${t("multi_factor_authentication.totp_title")}</b>
            </label>
            <label class="tn-radio">
                <input class="mfa-method-radio" type="radio" name="mfaMethod" value="oauth" />
                <b>${t("multi_factor_authentication.oauth_title")}</b>
            </label>
        </div>

        <div class="totp-options" style="display: none;">
            <p class="form-text">${t("multi_factor_authentication.totp_description")}</p>

            <hr />

            <h5>${t("multi_factor_authentication.totp_secret_title")}</h5>
            <div class="admonition note no-totp-secret" role="alert">
                ${t("multi_factor_authentication.no_totp_secret_warning")}
            </div>

            <div class="admonition warning" role="alert">
                ${t("multi_factor_authentication.totp_secret_description_warning")}
            </div>

            <button class="generate-totp btn btn-primary">
                ${t("multi_factor_authentication.totp_secret_generate")}
            </button>

            <hr />

            <h5>${t("multi_factor_authentication.recovery_keys_title")}</h5>
            <p class="form-text">${t("multi_factor_authentication.recovery_keys_description")}</p>
            <div class="admonition caution">
                ${t("multi_factor_authentication.recovery_keys_description_warning")}
            </div>

            <table style="border: 0px solid white">
                <tbody>
                    <tr>
                        <td class="key_0"></td>
                        <td style="width: 20px" />
                        <td class="key_1"></td>
                    </tr>
                    <tr>
                        <td class="key_2"></td>
                        <td />
                        <td class="key_3"></td>
                    </tr>
                    <tr>
                        <td class="key_4"></td>
                        <td />
                        <td class="key_5"></td>
                    </tr>
                    <tr>
                        <td class="key_6"></td>
                        <td />
                        <td class="key_7"></td>
                    </tr>
                </tbody>
            </table>

            <br>

            <button class="generate-recovery-code btn btn-primary"> ${t("multi_factor_authentication.recovery_keys_generate")} </button>
        </div>

        <div class="oauth-options" style="display: none;">
            <p class="form-text">${t("multi_factor_authentication.oauth_description")}</p>
            <div class="admonition note oauth-warning" role="alert">
                ${t("multi_factor_authentication.oauth_description_warning")}
            </div>
            <div class="admonition caution missing-vars" role="alert" style="display: none;"></div>
            <hr />
            <div class="col-md-6">
                <span><b>${t("multi_factor_authentication.oauth_user_account")}</b></span><span class="user-account-name">${t("multi_factor_authentication.oauth_user_not_logged_in")}</span>
                <br>
                <span><b>${t("multi_factor_authentication.oauth_user_email")}</b></span><span class="user-account-email">${t("multi_factor_authentication.oauth_user_not_logged_in")}</span>
            </div>
        </div>
    </div>
</div>
`;

const TPL_ELECTRON = `
<div class="options-section">
    <h4>${t("multi_factor_authentication.title")}</h4>
    <p class="form-text">${t("multi_factor_authentication.electron_disabled")}</p>
</div>
`;

interface OAuthStatus {
    enabled: boolean;
    name?: string;
    email?: string;
    missingVars?: string[];
}

interface TOTPStatus {
    set: boolean;
}

interface RecoveryKeysResponse {
    success: boolean;
    recoveryCodes?: string[];
    keysExist?: boolean;
    usedRecoveryCodes?: string[];
}

export default class MultiFactorAuthenticationOptions extends OptionsWidget {
    private $mfaEnabledCheckbox!: JQuery<HTMLElement>;
    private $mfaOptions!: JQuery<HTMLElement>;
    private $mfaMethodRadios!: JQuery<HTMLElement>;
    private $totpOptions!: JQuery<HTMLElement>;
    private $noTotpSecretWarning!: JQuery<HTMLElement>;
    private $generateTotpButton!: JQuery<HTMLElement>;
    private $generateRecoveryCodeButton!: JQuery<HTMLElement>;
    private $recoveryKeys: JQuery<HTMLElement>[] = [];
    private $oauthOptions!: JQuery<HTMLElement>;
    private $UserAccountName!: JQuery<HTMLElement>;
    private $UserAccountEmail!: JQuery<HTMLElement>;
    private $oauthWarning!: JQuery<HTMLElement>;
    private $missingVars!: JQuery<HTMLElement>;

    doRender() {
        const template = utils.isElectron() ? TPL_ELECTRON : TPL;
        this.$widget = $(template);

        if (!utils.isElectron()) {
            this.$mfaEnabledCheckbox = this.$widget.find(".mfa-enabled-checkbox");
            this.$mfaOptions = this.$widget.find(".mfa-options");
            this.$mfaMethodRadios = this.$widget.find(".mfa-method-radio");
            this.$totpOptions = this.$widget.find(".totp-options");
            this.$noTotpSecretWarning = this.$widget.find(".no-totp-secret");
            this.$generateTotpButton = this.$widget.find(".generate-totp");
            this.$generateRecoveryCodeButton = this.$widget.find(".generate-recovery-code");

            this.$oauthOptions = this.$widget.find(".oauth-options");
            this.$UserAccountName = this.$widget.find(".user-account-name");
            this.$UserAccountEmail = this.$widget.find(".user-account-email");
            this.$oauthWarning = this.$widget.find(".oauth-warning");
            this.$missingVars = this.$widget.find(".missing-vars");

            this.$recoveryKeys = [];
            for (let i = 0; i < 8; i++) {
                this.$recoveryKeys.push(this.$widget.find(".key_" + i));
            }

            this.$generateRecoveryCodeButton.on("click", async () => {
                await this.setRecoveryKeys();
            });

            this.$generateTotpButton.on("click", async () => {
                await this.generateKey();
            });

            this.displayRecoveryKeys();

            this.$mfaEnabledCheckbox.on("change", () => {
                const isChecked = this.$mfaEnabledCheckbox.is(":checked");
                this.$mfaOptions.toggle(isChecked);
                if (!isChecked) {
                    this.$totpOptions.hide();
                    this.$oauthOptions.hide();
                } else {
                    this.$mfaMethodRadios.filter('[value="totp"]').prop("checked", true);
                    this.$totpOptions.show();
                    this.$oauthOptions.hide();
                }
                this.updateCheckboxOption("mfaEnabled", this.$mfaEnabledCheckbox);
            });

            this.$mfaMethodRadios.on("change", () => {
                const selectedMethod = this.$mfaMethodRadios.filter(":checked").val();
                this.$totpOptions.toggle(selectedMethod === "totp");
                this.$oauthOptions.toggle(selectedMethod === "oauth");
                this.updateOption("mfaMethod", selectedMethod);
            });
        }
    }

    async setRecoveryKeys() {
        const result = await server.get<RecoveryKeysResponse>("totp_recovery/generate");
        if (!result.success) {
            toastService.showError(t("multi_factor_authentication.recovery_keys_error"));
            return;
        }
        if (result.recoveryCodes) {
            this.keyFiller(result.recoveryCodes);
            await server.post("totp_recovery/set", {
                recoveryCodes: result.recoveryCodes,
            });
        }
    }

    async displayRecoveryKeys() {
        const result = await server.get<RecoveryKeysResponse>("totp_recovery/enabled");
        if (!result.success) {
            this.fillKeys(t("multi_factor_authentication.recovery_keys_error"));
            return;
        }

        if (!result.keysExist) {
            this.fillKeys(t("multi_factor_authentication.recovery_keys_no_key_set"));
            this.$generateRecoveryCodeButton.text(t("multi_factor_authentication.recovery_keys_generate"));
            return;
        }

        const usedResult = await server.get<RecoveryKeysResponse>("totp_recovery/used");

        if (usedResult.usedRecoveryCodes) {
            this.keyFiller(usedResult.usedRecoveryCodes);
            this.$generateRecoveryCodeButton.text(t("multi_factor_authentication.recovery_keys_regenerate"));
        } else {
            this.fillKeys(t("multi_factor_authentication.recovery_keys_no_key_set"));
        }
    }

    private keyFiller(values: string[]) {
        this.fillKeys("");

        values.forEach((key, index) => {
            if (typeof key === 'string') {
                const date = new Date(key.replace(/\//g, '-'));
                if (isNaN(date.getTime())) {
                    this.$recoveryKeys[index].text(key);
                } else {
                    this.$recoveryKeys[index].text(t("multi_factor_authentication.recovery_keys_used", { date: key.replace(/\//g, '-') }));
                }
            } else {
                this.$recoveryKeys[index].text(t("multi_factor_authentication.recovery_keys_unused", { index: key }));
            }
        });
    }

    private fillKeys(message: string) {
        for (let i = 0; i < 8; i++) {
            this.$recoveryKeys[i].text(message);
        }
    }

    async generateKey() {
        const totpStatus = await server.get<TOTPStatus>("totp/status");

        if (totpStatus.set) {
            const confirmed = await dialogService.confirm(t("multi_factor_authentication.totp_secret_regenerate_confirm"));

            if (!confirmed) {
                return;
            }
        }

        const result = await server.get<{ success: boolean; message: string }>("totp/generate");

        if (result.success) {
            await dialogService.prompt({
                title: t("multi_factor_authentication.totp_secret_generated"),
                message: t("multi_factor_authentication.totp_secret_warning"),
                defaultValue: result.message,
                shown: ({ $answer }) => {
                    if ($answer) {
                        $answer.prop('readonly', true);
                    }
                }
            });

            this.$generateTotpButton.text(t("multi_factor_authentication.totp_secret_regenerate"));

            await this.setRecoveryKeys();
        } else {
            toastService.showError(result.message);
        }
    }

    optionsLoaded(options: OptionMap) {
        if (!utils.isElectron()) {
            this.$mfaEnabledCheckbox.prop("checked", options.mfaEnabled === "true");

            this.$mfaOptions.toggle(options.mfaEnabled === "true");
            if (options.mfaEnabled === "true") {
                const savedMethod = options.mfaMethod || "totp";
                this.$mfaMethodRadios.filter(`[value="${savedMethod}"]`).prop("checked", true);
                this.$totpOptions.toggle(savedMethod === "totp");
                this.$oauthOptions.toggle(savedMethod === "oauth");
            } else {
                this.$totpOptions.hide();
                this.$oauthOptions.hide();
            }

            server.get<OAuthStatus>("oauth/status").then((result) => {
                if (result.enabled) {
                    if (result.name) this.$UserAccountName.text(result.name);
                    if (result.email) this.$UserAccountEmail.text(result.email);
                    this.$oauthWarning.hide();
                    this.$missingVars.hide();
                } else {
                    this.$UserAccountName.text(t("multi_factor_authentication.oauth_user_not_logged_in"));
                    this.$UserAccountEmail.text(t("multi_factor_authentication.oauth_user_not_logged_in"));
                    this.$oauthWarning.show();
                    if (result.missingVars && result.missingVars.length > 0) {
                        this.$missingVars.show();
                        const missingVarsList = result.missingVars.map(v => `"${v}"`);
                        this.$missingVars.html(t("multi_factor_authentication.oauth_missing_vars", { variables: missingVarsList.join(", ") }));
                    }
                }
            });

            server.get<TOTPStatus>("totp/status").then((result) => {
                if (result.set) {
                    this.$generateTotpButton.text(t("multi_factor_authentication.totp_secret_regenerate"));
                    this.$noTotpSecretWarning.hide();
                } else {
                    this.$noTotpSecretWarning.show();
                }
            });
        }
    }
}
