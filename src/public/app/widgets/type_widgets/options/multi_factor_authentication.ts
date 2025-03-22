import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";
import type { OptionMap } from "../../../../../services/options_interface.js";
import { t } from "../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("multi_factor_authentication.title")}</h4>
    <p class="form-text">${t("multi_factor_authentication.description")}</p>
</div>

<div class="options-section">
    <h4>${t("multi_factor_authentication.oauth_title")}</h4>

    <div class="form-group row">
        <div class="col-md-6 side-checkbox">
            <label class="form-check tn-checkbox">
                <input type="checkbox" class="oauth-enabled-checkbox form-check-input" disabled />
                <b>${t("multi_factor_authentication.oauth_enabled")}</b>
            </label>
        </div>
    </div>

    <div class="alert alert-warning env-oauth-enabled" role="alert" style="font-weight: bold; color: red !important;"></div>

    <div class="col-md-6">
        <span><b>User Account: </b></span><span class="user-account-name"> Not logged in!</span>
        <br>
        <span><b>User Email: </b></span><span class="user-account-email"> Not logged in!</span>
    </div>

    <p class="form-text">${t("multi_factor_authentication.oauth_description")}</p>
</div>

<div class="options-section">
    <h4>${t("multi_factor_authentication.totp_title")}</h4>

    <div class="form-group row">
        <div class="col-md-6 side-checkbox">
            <label class="form-check tn-checkbox">
                <input type="checkbox" class="totp-enabled form-check-input" disabled />
                <b>${t("multi_factor_authentication.totp_enabled")}</b>
            </label>
        </div>
    </div>

    <div class="alert alert-warning env-totp-enabled" role="alert" style="font-weight: bold; color: red !important;"></div>

    <p class="form-text">${t("multi_factor_authentication.totp_description")}</p>
</div>

<div class="options-section">
    <h4>${t("multi_factor_authentication.totp_secret_title")}</h4>

    <div class="form-group">
        <div class="totp-secret">${t("multi_factor_authentication.totp_secret_description")}</div>
    </div>

    <button class="regenerate-totp btn btn-primary"> ${t("multi_factor_authentication.totp_secret_generate")} </button>
</div>

<div class="options-section">
    <h4>${t("multi_factor_authentication.recovery_keys_title")}</h4>

    <p class="form-text">${t("multi_factor_authentication.recovery_keys_description")}</p>

    <div class="alert alert-warning" role="alert" style="font-weight: bold; color: red !important;">
        ${t("multi_factor_authentication.recovery_keys_description_warning")}
    </div>

    <br>

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

    <button class="generate-recovery-code btn btn-primary" disabled="true"> Generate Recovery Keys </button>
</div>
`;

interface OAuthStatus {
    enabled: boolean;
    name?: string;
    email?: string;
}

interface TOTPStatus {
    enabled: boolean;
    message: boolean;
}

interface RecoveryKeysResponse {
    success: boolean;
    recoveryCodes?: string[];
    keysExist?: boolean;
    usedRecoveryCodes?: string[];
}

export default class MultiFactorAuthenticationOptions extends OptionsWidget {
    private $regenerateTotpButton!: JQuery<HTMLElement>;
    private $totpEnabled!: JQuery<HTMLElement>;
    private $totpSecret!: JQuery<HTMLElement>;
    private $totpSecretInput!: JQuery<HTMLElement>;
    private $authenticatorCode!: JQuery<HTMLElement>;
    private $generateRecoveryCodeButton!: JQuery<HTMLElement>;
    private $oAuthEnabledCheckbox!: JQuery<HTMLElement>;
    private $oauthLoginButton!: JQuery<HTMLElement>;
    private $UserAccountName!: JQuery<HTMLElement>;
    private $UserAccountEmail!: JQuery<HTMLElement>;
    private $envEnabledTOTP!: JQuery<HTMLElement>;
    private $envEnabledOAuth!: JQuery<HTMLElement>;
    private $recoveryKeys: JQuery<HTMLElement>[] = [];
    private $protectedSessionTimeout!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$regenerateTotpButton = this.$widget.find(".regenerate-totp");
        this.$totpEnabled = this.$widget.find(".totp-enabled");
        this.$totpSecret = this.$widget.find(".totp-secret");
        this.$totpSecretInput = this.$widget.find(".totp-secret-input");
        this.$authenticatorCode = this.$widget.find(".authenticator-code");
        this.$generateRecoveryCodeButton = this.$widget.find(".generate-recovery-code");
        this.$oAuthEnabledCheckbox = this.$widget.find(".oauth-enabled-checkbox");
        this.$oauthLoginButton = this.$widget.find(".oauth-login-button");
        this.$UserAccountName = this.$widget.find(".user-account-name");
        this.$UserAccountEmail = this.$widget.find(".user-account-email");
        this.$envEnabledTOTP = this.$widget.find(".env-totp-enabled");
        this.$envEnabledOAuth = this.$widget.find(".env-oauth-enabled");

        this.$recoveryKeys = [];
        for (let i = 0; i < 8; i++) {
            this.$recoveryKeys.push(this.$widget.find(".key_" + i));
        }

        this.$generateRecoveryCodeButton.on("click", async () => {
            await this.setRecoveryKeys();
        });

        this.$regenerateTotpButton.on("click", async () => {
            await this.generateKey();
        });

        this.$protectedSessionTimeout = this.$widget.find(".protected-session-timeout-in-seconds");
        this.$protectedSessionTimeout.on("change", () => {
            this.updateOption("protectedSessionTimeout", this.$protectedSessionTimeout.val());
        });

        this.displayRecoveryKeys();
    }

    async setRecoveryKeys() {
        const result = await server.get<RecoveryKeysResponse>("totp_recovery/generate");
        if (!result.success) {
            toastService.showError("Error in recovery code generation!");
            return;
        }
        if (result.recoveryCodes) {
            this.keyFiller(result.recoveryCodes);
            await server.post("totp_recovery/set", {
                recoveryCodes: result.recoveryCodes,
            });
        }
    }

    private keyFiller(values: string[]) {
        const keys = values.join(",").split(",");
        for (let i = 0; i < keys.length; i++) {
            this.$recoveryKeys[i].text(keys[i]);
        }
    }

    async generateKey() {
        const result = await server.get<{ success: boolean; message: string }>("totp/generate");
        if (result.success) {
            this.$totpSecret.text(result.message);
        } else {
            toastService.showError(result.message);
        }
    }

    optionsLoaded(options: OptionMap) {
        server.get<OAuthStatus>("oauth/status").then((result) => {
            if (result.enabled) {
                this.$oAuthEnabledCheckbox.prop("checked", result.enabled);
                if (result.name) this.$UserAccountName.text(result.name);
                if (result.email) this.$UserAccountEmail.text(result.email);
            } else {
                this.$envEnabledOAuth.text(
                    "Set SSO_ENABLED as environment variable to 'true' to enable (Requires restart)"
                );
            }
        });

        server.get<TOTPStatus>("totp/status").then((result) => {
            if (result.enabled) {
                this.$totpEnabled.prop("checked", result.message);
                this.$authenticatorCode.prop("disabled", !result.message);
                this.$generateRecoveryCodeButton.prop("disabled", !result.message);
            } else {
                this.$totpEnabled.prop("checked", false);
                this.$totpEnabled.prop("disabled", true);
                this.$authenticatorCode.prop("disabled", true);
                this.$generateRecoveryCodeButton.prop("disabled", true);

                this.$envEnabledTOTP.text(
                    "Set TOTP_ENABLED as environment variable to 'true' to enable (Requires restart)"
                );
            }
        });
        this.$protectedSessionTimeout.val(Number(options.protectedSessionTimeout));
    }

    async displayRecoveryKeys() {
        const result = await server.get<RecoveryKeysResponse>("totp_recovery/enabled");
        if (!result.success) {
            this.keyFiller(Array(8).fill("Error generating recovery keys!"));
            return;
        }

        if (!result.keysExist) {
            this.keyFiller(Array(8).fill("No key set"));
            this.$generateRecoveryCodeButton.text("Generate Recovery Codes");
            return;
        }

        const usedResult = await server.get<RecoveryKeysResponse>("totp_recovery/used");
        if (usedResult.usedRecoveryCodes) {
            this.keyFiller(usedResult.usedRecoveryCodes);
            this.$generateRecoveryCodeButton.text("Regenerate Recovery Codes");
        }
    }
}
