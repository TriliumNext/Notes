import { get, post, server_response } from "../../../services/server.js";
import { showMessage, showError } from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";

const TPL = `
<div class="options-section">
    <h2 class=""><b>What is Multi-Factor Authentication?</b></h2>
    <div class="">
        <i>
            Multi-Factor Authentication (MFA) adds an extra layer of security to your account. Instead
             of just entering a password to log in, MFA requires you to provide one or more additional 
             pieces of evidence to verify your identity. This way, even if someone gets hold of your 
             password, they still can't access your account without the second piece of information. 
             It's like adding an extra lock to your door, making it much harder for anyone else to 
             break in.</i>
    </div>
    <br>
    <div>
        <h3><b>OAuth/OpenID</b></h3>
        <span><i>OpenID is a standardized way to let you log into websites using an account from another service, like Google, to verify your identity.</i></span>
        <div>
            <label>
            <b>Enable OAuth/OpenID</b>
            </label>
            <input type="checkbox" class="oauth-enabled-checkbox" disabled="true" />
            <span class="env-oauth-enabled" "alert alert-warning" role="alert" style="font-weight: bold; color: red !important;" > </span>
        </div>
        <div>
            <span> <b>Token status: </b></span><span class="token-status"> Needs login! </span><span><b> User status: </b></span><span class="user-status"> No user saved!</span>
            <br>
            <button class="oauth-login-button" onclick="location.href='/authenticate'" > Login to configured OAuth/OpenID service </button>
            <button class="save-user-button" > Save User </button>
        </div>
    </div>
    <br>
    <h3><b>Time-based One-Time Password</b></h3>
    <div>
        <label>
        <b>Enable TOTP</b>
        </label>
        <input type="checkbox" class="totp-enabled" /> 
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
        <button class="regenerate-totp" disabled="true"> Regenerate TOTP Secret </button>
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
                    <td class="key_0">Recover Key 1</td>
                    <td style="width: 20px" />
                    <td class="key_1">Recover Key 2</td>
                </tr>
                <tr>
                    <td class="key_2">Recover Key 3</td>
                    <td />
                    <td class="key_3">Recover Key 4</td>
                </tr>
                <tr>
                    <td class="key_4">Recover Key 5</td>
                    <td />
                    <td class="key_5">Recover Key 6</td>
                </tr>
                <tr>
                    <td class="key_6">Recover Key 7</td>
                    <td />
                    <td class="key_7">Recover Key 8</td>
                </tr>
            </tbody>
        </table>
        <br>
        <button class="generate-recovery-code" disabled="true"> Generate Recovery Keys </button>
    </div>
</div>
`;
let $widget:any;

let $regenerateTotpButton: any;
let $totpDetails: any;
let $totpEnabled: any;
let $totpSecret: any;
let $totpSecretInput: any;
let $authenticatorCode: any;
let $generateRecoveryCodeButton: any;
let $oAuthEnabledCheckbox: any;
let $saveUserButton: any;
let $oauthLoginButton: any;
let $tokenStatus: any;
let $userStatus: any;
let $envEnabledTOTP: any;
let $envEnabledOAuth: any;
let $recoveryKeys: any;
let $protectedSessionTimeout: any;

interface totpHttpResponse {
  success: boolean,
  recoveryCodes: string,
  message: string,
  keysExist: boolean,
  usedRecoveryCodes: string,
  enabled: boolean,
}

export default class MultiFactorAuthenticationOptions extends OptionsWidget {
  
  constructor(A:String){
    super();
  }
  
  doRender() {
    $widget = $(TPL);

    $regenerateTotpButton = $widget.find(".regenerate-totp");
    $totpDetails = $widget.find(".totp-details");
    $totpEnabled = $widget.find(".totp-enabled");
    $totpSecret = $widget.find(".totp-secret");
    $totpSecretInput = $widget.find(".totp-secret-input");
    $authenticatorCode = $widget.find(".authenticator-code");
    $generateRecoveryCodeButton = $widget.find(
      ".generate-recovery-code"
    );
    $oAuthEnabledCheckbox = $widget.find(".oauth-enabled-checkbox");
    $saveUserButton = $widget.find(".save-user-button");
    $oauthLoginButton = $widget.find(".oauth-login-button");
    $tokenStatus = $widget.find(".token-status");
    $userStatus = $widget.find(".user-status");
    $envEnabledTOTP = $widget.find(".env-totp-enabled");
    $envEnabledOAuth = $widget.find(".env-oauth-enabled");

    $recoveryKeys = [];

    for (let i = 0; i < 8; i++)
      $recoveryKeys.push($widget.find(".key_" + i));

    $totpEnabled.on("change", async () => {
      this.updateSecret();
    });

    $oAuthEnabledCheckbox.on("change", async () => {
      this.updateOAuthStatus();
    });

    $generateRecoveryCodeButton.on("click", async () => {
      this.setRecoveryKeys();
    });

    $regenerateTotpButton.on("click", async () => {
      this.generateKey();
    });

    $saveUserButton.on("click", () => {
      get("oauth/authenticate")
        .then((result: server_response) => {
          console.log(result.message);
          showMessage(result.message);
        })
        .catch((result: server_response) => {
          console.error(result.message);
          showError(result.message);
        });
    });

    $protectedSessionTimeout = $widget.find(
      ".protected-session-timeout-in-seconds"
    );
    $protectedSessionTimeout.on("change", () =>
      this.updateOption(
        "protectedSessionTimeout",
        $protectedSessionTimeout.val()
      )
    );

    this.displayRecoveryKeys();
  }

  async updateSecret() {
    if ($totpEnabled.prop("checked")) post("totp/enable");
    else post("totp/disable");
  }

  async updateOAuthStatus() {
    if ($oAuthEnabledCheckbox.prop("checked")) post("oauth/enable");
    else post("oauth/disable");
  }

  async setRecoveryKeys() {
    get("totp_recovery/generate").then((result: totpHttpResponse) => {
      if (!result.success) {
        showError("Error in revevery code generation!");
        return;
      }
      this.keyFiller(result.recoveryCodes);
      post("totp_recovery/set", {
        recoveryCodes: result.recoveryCodes
      });
    });

  }

  async keyFiller(values: string | string[]) {
    // Forces values to be a string so it doesn't error out when I split.
    // Will be a non-issue when I update everything to typescript.
    if ( typeof values == "string")
    {
      const keys = (values + "").split(",");
      for (let i = 0; i < keys.length; i++) $recoveryKeys[i].text(keys[i]);
    }
    else
    {
      for (let i = 0; i < values.length; i++) $recoveryKeys[i].text(values[i]);
    }

  }

  async generateKey() {
    get("totp/generate").then((result: totpHttpResponse) => {
      if (result.success) {
        $totpSecret.text(result.message);
      } else {
        showError(result.message);
      }
    });
  }

  optionsLoaded(options) {
    // TODO: Rework the logic since I've changed how OAuth works

    // get("oauth/status").then((result) => {
    //   if (result.enabled) {
    //     if (result.success)
    //       $oAuthEnabledCheckbox.prop("checked", result.message);

    //     $oauthLoginButton.prop("disabled", !result.message);
    //     $saveUserButton.prop("disabled", !result.message);

    //     if (result.message) {
    //       $oauthLoginButton.prop("disabled", false);
    //       $saveUserButton.prop("disabled", false);
    //       get("oauth/validate").then((result) => {
    //         if (result.success) {
    //           $tokenStatus.text("Logged in!");

    //           if (result.user) {
    //             $userStatus.text("User saved!");
    //           } else {
    //             $saveUserButton.prop("disabled", false);
    //             $userStatus.text("User not saved");
    //           }
    //         } else $tokenStatus.text("Not logged in!");
    //       });
    //     }
    //   } else {
    //     $oAuthEnabledCheckbox.prop("checked", false);
    //     $oauthLoginButton.prop("disabled", true);
    //     $saveUserButton.prop("disabled", true);
    //     $oAuthEnabledCheckbox.prop("disabled", true);

    //     $envEnabledOAuth.text(
    //       "OAuth can only be enabled with environment variables. REQUIRES RESTART"
    //     );
    //   }
    // });

    get("totp/status").then((result: totpHttpResponse) => {
      if (result.enabled)
        if (result.success) {
          $totpEnabled.prop("checked", result.message);
          $totpSecretInput.prop("disabled", !result.message);
          $totpSecret.prop("disapbled", !result.message);
          $regenerateTotpButton.prop("disabled", !result.message);
          $authenticatorCode.prop("disabled", !result.message);
          $generateRecoveryCodeButton.prop("disabled", !result.message);
        } else {
          showError(result.message);
        }
      else {
        $totpEnabled.prop("checked", false);
        $totpEnabled.prop("disabled", true);
        $totpSecretInput.prop("disabled", true);
        $totpSecret.prop("disapbled", true);
        $regenerateTotpButton.prop("disabled", true);
        $authenticatorCode.prop("disabled", true);
        $generateRecoveryCodeButton.prop("disabled", true);

        $envEnabledTOTP.text(
          "TOTP_ENABLED is not set in environment variable. Requires restart."
        );
      }
    });
    $protectedSessionTimeout.val(options.protectedSessionTimeout);
  }

  displayRecoveryKeys() {
    get("totp_recovery/enabled").then((result: totpHttpResponse) => {
      if (!result.success) {
        this.keyFiller(Array(8).fill("Error generating recovery keys!"));
        return;
      }

      if (!result.keysExist) {
        this.keyFiller(Array(8).fill("No key set"));
        $generateRecoveryCodeButton.text("Generate Recovery Codes");
        return;
      }
    });
    get("totp_recovery/used").then((result: totpHttpResponse) => {
      this.keyFiller((result.usedRecoveryCodes + "").split(","));
      $generateRecoveryCodeButton.text("Regenerate Recovery Codes");
    });
  }
}