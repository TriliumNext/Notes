import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";

const TPL = `
<div class="options-section">
    <h2 class=""><b>What is Multi-Factor Authentication?</b></h2>
    <div class="">
        <i>
            Multi-Factor Authentication (MFA) adds an extra layer of security to your account. Instead
             of just entering a password to log in, MFA requires you to provide one or more additional 
             pieces of evidence to verify your identity. This way, even if someone gets hold of your 
             password, they still ca TOTP_ENABLED is not set in environment variable. Requires restart.n't access your account without the second piece of information. 
             It's like adding an extra lock to your door, making it much harder for anyone else to 
             break in.</i>
    </div>
    <br>
    <div>
        <h3><b>OAuth/OpenID</b></h3>
        <span><i>OpenID is a standardized way to let you log into websites using an account from another service, like Google, to verify your identity.</i></span>
        <div>
            <label>
            <b>OAuth/OpenID Enabled</b>
            </label>
            <input type="checkbox" class="oauth-enabled-checkbox" disabled="true" />
            <span class="env-oauth-enabled" "alert alert-warning" role="alert" style="font-weight: bold; color: red !important;" > </span>
        </div>
        <div>
            <span> <b>User Account: </b></span><span class="user-account-name"> Not logged in! </span>
            <br>
            <span><b> User Email: </b></span><span class="user-account-email"> Not logged in!</span>
        </div>
    </div>
    <br>
    <h3><b>Time-based One-Time Password</b></h3>
    <div>
        <label>
        <b>TOTP Enabled</b>
        </label>
        <input type="checkbox" class="totp-enabled" disabled="true" /> 
        <span class="env-totp-enabled" "alert alert-warning" role="alert" style="font-weight: bold; color: red !important;" > </span>
    </div>
    <div>
        <span><i>TOTP (Time-Based One-Time Password) is a security feature that generates a unique, temporary 
        code which changes every 30 seconds. You use this code, along with your password to log into your 
        account, making it much harder for anyone else to access it.</i></span>
    </div>
    <br>
    <h4> Generate TOTP Secret </h4>
    <div>
        <span class="totp-secret" > TOTP Secret Key </span>
        <br>
        <button class="regenerate-totp"> Generate TOTP Secret </button>
    </div>
    <br>
    <h4> Single Sign-on Recovery Keys </h4>
    <div>
        <span ><i>Single sign-on recovery keys are used to login in the event you cannot access your Authenticator codes. Keep them somewhere safe and secure. </i></span>
        <br><br>
        <span class="alert alert-warning" role="alert" style="font-weight: bold; color: red !important;">After a recovery key is used it cannot be used again.</span>
        <br><br>
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
        <button class="generate-recovery-code" disabled="true"> Generate Recovery Keys </button>
    </div>
</div>
`;

export default class MultiFactorAuthenticationOptions extends OptionsWidget {
  doRender() {
    this.$widget = $(TPL);

    this.$regenerateTotpButton = this.$widget.find(".regenerate-totp");
    this.$totpEnabled = this.$widget.find(".totp-enabled");
    this.$totpSecret = this.$widget.find(".totp-secret");
    this.$totpSecretInput = this.$widget.find(".totp-secret-input");
    this.$authenticatorCode = this.$widget.find(".authenticator-code");
    this.$generateRecoveryCodeButton = this.$widget.find(
      ".generate-recovery-code"
    );
    this.$oAuthEnabledCheckbox = this.$widget.find(".oauth-enabled-checkbox");
    this.$oauthLoginButton = this.$widget.find(".oauth-login-button");
    this.$UserAccountName = this.$widget.find(".user-account-name");
    this.$UserAccountEmail = this.$widget.find(".user-account-email");
    this.$envEnabledTOTP = this.$widget.find(".env-totp-enabled");
    this.$envEnabledOAuth = this.$widget.find(".env-oauth-enabled");


    this.$recoveryKeys = [];

    for (let i = 0; i < 8; i++)
    {
      this.$recoveryKeys.push(this.$widget.find(".key_" + i));
    }

    this.$generateRecoveryCodeButton.on("click", async () => {
      this.setRecoveryKeys();
    });

    this.$regenerateTotpButton.on("click", async () => {
      this.generateKey();
    });

    this.$protectedSessionTimeout = this.$widget.find(
      ".protected-session-timeout-in-seconds"
    );
    this.$protectedSessionTimeout.on("change", () =>
      this.updateOption(
        "protectedSessionTimeout",
        this.$protectedSessionTimeout.val()
      )
    );

    this.displayRecoveryKeys();
  }

  async setRecoveryKeys() {
    server.get("totp_recovery/generate").then((result) => {
      if (!result.success) {
        toastService.showError("Error in revevery code generation!");
        return;
      }
      this.keyFiller(result.recoveryCodes);
      server.post("totp_recovery/set", {
        recoveryCodes: result.recoveryCodes,
      });
    });
  }

  async keyFiller(values) {
    // Forces values to be a string so it doesn't error out when I split.
    // Will be a non-issue when I update everything to typescript.
    const keys = (values + "").split(",");
    for (let i = 0; i < keys.length; i++) this.$recoveryKeys[i].text(keys[i]);
  }

  async generateKey() {
    server.get("totp/generate").then((result) => {
      if (result.success) {
        this.$totpSecret.text(result.message);
      } else {
        toastService.showError(result.message);
      }
    });
  }

  optionsLoaded(options) {
    server.get("oauth/status").then((result) => {
      if (result.enabled) {
        this.$oAuthEnabledCheckbox.prop("checked", result.enabled);
        this.$UserAccountName.text(result.name);
        this.$UserAccountEmail.text(result.email);
      }else
        this.$envEnabledOAuth.text(
          "set SSO_ENABLED as environment variable to 'true' to enable (Requires restart)"
      );
    });

    server.get("totp/status").then((result) => {
      if (result.enabled){
          this.$totpEnabled.prop("checked", result.message);
          this.$authenticatorCode.prop("disabled", !result.message);
          this.$generateRecoveryCodeButton.prop("disabled", !result.message);
      }
      else {
        this.$totpEnabled.prop("checked", false);
        this.$totpEnabled.prop("disabled", true);
        this.$authenticatorCode.prop("disabled", true);
        this.$generateRecoveryCodeButton.prop("disabled", true);

        this.$envEnabledTOTP.text(
          "Set TOTP_ENABLED as environment variable to 'true' to enable (Requires restart)"
        );
      }
    });
    this.$protectedSessionTimeout.val(options.protectedSessionTimeout);
  }

  displayRecoveryKeys() {
    server.get("totp_recovery/enabled").then((result) => {
      if (!result.success) {
        this.keyFiller(Array(8).fill("Error generating recovery keys!"));
        return;
      }

      if (!result.keysExist) {
        this.keyFiller(Array(8).fill("No key set"));
        this.$generateRecoveryCodeButton.text("Generate Recovery Codes");
        return;
      }
    });
    server.get("totp_recovery/used").then((result) => {
      this.keyFiller((result.usedRecoveryCodes + "").split(","));
      this.$generateRecoveryCodeButton.text("Regenerate Recovery Codes");
    });
  }
}