import server from '../../../services/server.js';
import toastService from '../../../services/toast.js';
import OptionsWidget from './options_widget.js';

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
            <input type="checkbox" class="oauth-enabled-checkbox" />
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

export default class MultiFactorAuthenticationOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$regenerateTotpButton = this.$widget.find('.regenerate-totp');
        this.$totpDetails = this.$widget.find('.totp-details');
        this.$totpEnabled = this.$widget.find('.totp-enabled');
        this.$totpSecret = this.$widget.find('.totp-secret');
        this.$totpSecretInput = this.$widget.find('.totp-secret-input');
        this.$authenticatorCode = this.$widget.find('.authenticator-code');
        this.$generateRecoveryCodeButton = this.$widget.find('.generate-recovery-code');
        this.$oAuthEnabledCheckbox = this.$widget.find('.oauth-enabled-checkbox');
        this.$saveUserButton = this.$widget.find('.save-user-button');
        this.$oauthLoginButton = this.$widget.find('.oauth-login-button');
        this.$tokenStatus = this.$widget.find('.token-status');
        this.$userStatus = this.$widget.find('.user-status');
        this.$envEnabledTOTP = this.$widget.find('.env-totp-enabled');
        this.$envEnabledOAuth = this.$widget.find('.env-oauth-enabled');

        this.$recoveryKeys = [];

        for (let i = 0; i < 8; i++) this.$recoveryKeys.push(this.$widget.find('.key_' + i));

        this.$totpEnabled.on('change', async () => {
            this.updateSecret();
        });

        this.$oAuthEnabledCheckbox.on('change', async () => {
            this.updateOAuthStatus();
        });

        this.$generateRecoveryCodeButton.on('click', async () => {
            this.setRecoveryKeys();
        });

        this.$regenerateTotpButton.on('click', async () => {
            this.generateKey();
        });

        this.$saveUserButton.on('click', (async) => {
            server
                .get('oauth/authenticate')
                .then((result) => {
                    console.log(result.message);
                    toastService.showMessage(result.message);
                })
                .catch((result) => {
                    console.error(result.message);
                    toastService.showError(result.message);
                });
        });

        this.$protectedSessionTimeout = this.$widget.find('.protected-session-timeout-in-seconds');
        this.$protectedSessionTimeout.on('change', () =>
            this.updateOption('protectedSessionTimeout', this.$protectedSessionTimeout.val())
        );

        this.displayRecoveryKeys();
    }

    async updateSecret() {
        if (this.$totpEnabled.prop('checked')) server.post('totp/enable');
        else server.post('totp/disable');
    }

    async updateOAuthStatus() {
        if (this.$oAuthEnabledCheckbox.prop('checked')) server.post('oauth/enable');
        else server.post('oauth/disable');
    }

    async setRecoveryKeys() {
        server.get('totp_recovery/generate').then((result) => {
            if (!result.success) {
                toastService.showError('Error in revevery code generation!');
                return;
            }
            this.keyFiller(result.recoveryCodes);
            server.post('totp_recovery/set', {
                recoveryCodes: result.recoveryCodes,
            });
        });
    }

    async keyFiller(values) {
        // Forces values to be a string so it doesn't error out when I split.
        // Will be a non-issue when I update everything to typescript.
        const keys = (values + '').split(',');
        for (let i = 0; i < keys.length; i++) this.$recoveryKeys[i].text(keys[i]);
    }

    async generateKey() {
        server.get('totp/generate').then((result) => {
            if (result.success) {
                this.$totpSecret.text(result.message);
            } else {
                toastService.showError(result.message);
            }
        });
    }

    optionsLoaded(options) {
        server.get('oauth/status').then((result) => {
            if (result.enabled) {
                if (result.success) this.$oAuthEnabledCheckbox.prop('checked', result.message);

                this.$oauthLoginButton.prop('disabled', !result.message);
                this.$saveUserButton.prop('disabled', !result.message);

                if (result.message) {
                    this.$oauthLoginButton.prop('disabled', false);
                    this.$saveUserButton.prop('disabled', false);
                    server.get('oauth/validate').then((result) => {
                        if (result.success) {
                            this.$tokenStatus.text('Logged in!');

                            if (result.user) {
                                this.$userStatus.text('User saved!');
                            } else {
                                this.$saveUserButton.prop('disabled', false);
                                this.$userStatus.text('User not saved');
                            }
                        } else this.$tokenStatus.text('Not logged in!');
                    });
                }
            } else {
                this.$oAuthEnabledCheckbox.prop('checked', false);
                this.$oauthLoginButton.prop('disabled', true);
                this.$saveUserButton.prop('disabled', true);
                this.$oAuthEnabledCheckbox.prop('disabled', true);

                this.$envEnabledOAuth.text('OAUTH_ENABLED is not set in environment variable. Requires restart.');
            }
        });

        server.get('totp/status').then((result) => {
            if (result.enabled)
                if (result.success) {
                    this.$totpEnabled.prop('checked', result.message);
                    this.$totpSecretInput.prop('disabled', !result.message);
                    this.$totpSecret.prop('disapbled', !result.message);
                    this.$regenerateTotpButton.prop('disabled', !result.message);
                    this.$authenticatorCode.prop('disabled', !result.message);
                    this.$generateRecoveryCodeButton.prop('disabled', !result.message);
                } else {
                    toastService.showError(result.message);
                }
            else {
                this.$totpEnabled.prop('checked', false);
                this.$totpEnabled.prop('disabled', true);
                this.$totpSecretInput.prop('disabled', true);
                this.$totpSecret.prop('disapbled', true);
                this.$regenerateTotpButton.prop('disabled', true);
                this.$authenticatorCode.prop('disabled', true);
                this.$generateRecoveryCodeButton.prop('disabled', true);

                this.$envEnabledTOTP.text('TOTP_ENABLED is not set in environment variable. Requires restart.');
            }
        });
        this.$protectedSessionTimeout.val(options.protectedSessionTimeout);
    }

    displayRecoveryKeys() {
        server.get('totp_recovery/enabled').then((result) => {
            if (!result.success) {
                this.keyFiller(Array(8).fill('Error generating recovery keys!'));
                return;
            }

            if (!result.keysExist) {
                this.keyFiller(Array(8).fill('No key set'));
                this.$generateRecoveryCodeButton.text('Generate Recovery Codes');
                return;
            }
        });
        server.get('totp_recovery/used').then((result) => {
            this.keyFiller((result.usedRecoveryCodes + '').split(','));
            this.$generateRecoveryCodeButton.text('Regenerate Recovery Codes');
        });
    }
}
