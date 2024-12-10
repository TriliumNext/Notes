import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t('share.settings_title')}</h4>
    
    <div class="form-group">
        <div class="custom-control custom-checkbox">
            <input class="custom-control-input redirect-bare-domain" type="checkbox" id="redirect-bare-domain">
            <label class="custom-control-label" for="redirect-bare-domain">${t('share.redirect_bare_domain')}</label>
            <p>${t('share.redirect_bare_domain_description')}</p>
        </div>
    </div>

    <div class="form-group">
        <div class="custom-control custom-checkbox">
            <input class="custom-control-input show-login-in-share" type="checkbox" id="showLoginInShare">
            <label class="custom-control-label" for="showLoginInShare">${t('share.show_login_in_share')}</label>
            <p>${t('share.show_login_in_share_description', { hostname: window.location.hostname })}</p>
        </div>
    </div>
</div>
`;

export default class ShareSettingsWidget extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$redirectBareDomain = this.$widget.find(".redirect-bare-domain");
        this.$showLoginInShare = this.$widget.find(".show-login-in-share");

        this.$redirectBareDomain.on('change', () => 
            this.updateCheckboxOption('redirectBareDomain', this.$redirectBareDomain));

        this.$showLoginInShare.on('change', () => 
            this.updateCheckboxOption('showLoginInShareTheme', this.$showLoginInShare));
    }

    optionsLoaded(options) {
        this.setCheckboxState(this.$redirectBareDomain, options.redirectBareDomain);
        this.setCheckboxState(this.$showLoginInShare, options.showLoginInShareTheme);
    }
}
