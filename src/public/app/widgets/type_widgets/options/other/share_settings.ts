import OptionsWidget from "../options_widget.js";
import options from "../../../../services/options.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap, OptionNames } from "../../../../../../services/options_interface.js";
import searchService from "../../../../services/search.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("share.title")}</h4>

    <label class="tn-checkbox">
        <input class="form-check-input" type="checkbox" name="redirectBareDomain" value="true">
        ${t("share.redirect_bare_domain")}
    </label>
    <p class="form-text">${t("share.redirect_bare_domain_description")}</p>

    <div class="share-root-check mt-2 mb-2" style="display: none;">
        <button class="btn btn-sm btn-secondary check-share-root">${t("share.check_share_root")}</button>
        <div class="share-root-status form-text mt-2"></div>
    </div>

    <label class="tn-checkbox">
        <input class="form-check-input use-clean-urls" type="checkbox" name="useCleanUrls" value="true">
        ${t("share.use_clean_urls")}
    </label>
    <p class="form-text">${t("share.use_clean_urls_description")}</p>

    <div class="form-group">
        <label>${t("share.share_path")}</label>
        <div>
            <input type="text" class="form-control share-path" placeholder="${t("share.share_path_placeholder")}">
        </div>
        <div class="form-text">
            ${t("share.share_path_description")}
        </div>
    </div>

    <label class="tn-checkbox">
        <input class="form-check-input show-login-in-share-theme" type="checkbox" name="showLoginInShareTheme" value="true">
        ${t("share.show_login_link")}
    </label>
    <p class="form-text">${t("share.show_login_link_description")}</p>
</div>`;

export default class ShareSettingsOptions extends OptionsWidget {
    private $redirectBareDomain!: JQuery<HTMLInputElement>;
    private $showLoginInShareTheme!: JQuery<HTMLInputElement>;
    private $useCleanUrls!: JQuery<HTMLInputElement>;
    private $sharePath!: JQuery<HTMLInputElement>;
    private $shareRootCheck!: JQuery<HTMLElement>;
    private $shareRootStatus!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$redirectBareDomain = this.$widget.find(".redirect-bare-domain");
        this.$showLoginInShareTheme = this.$widget.find(".show-login-in-share-theme");
        this.$useCleanUrls = this.$widget.find(".use-clean-urls");
        this.$sharePath = this.$widget.find(".share-path");
        this.$shareRootCheck = this.$widget.find(".share-root-check");
        this.$shareRootStatus = this.$widget.find(".share-root-status");

        this.$redirectBareDomain.on('change', () => {
            const redirectBareDomain = this.$redirectBareDomain.is(":checked");
            this.save();

            // Show/hide share root status section based on redirectBareDomain checkbox
            this.$shareRootCheck.toggle(redirectBareDomain);
            if (redirectBareDomain) {
                this.checkShareRoot();
            }
        });

        this.$showLoginInShareTheme.on('change', () => {
            const showLoginInShareTheme = this.$showLoginInShareTheme.is(":checked");
            this.save();
        });

        this.$useCleanUrls.on('change', () => {
            const useCleanUrls = this.$useCleanUrls.is(":checked");
            this.save();
        });

        this.$sharePath.on('change', () => {
            const sharePath = this.$sharePath.val() as string;
            this.save();
        });

        // Add click handler for check share root button
        this.$widget.find(".check-share-root").on("click", () => this.checkShareRoot());
    }

    async optionsLoaded(options: OptionMap) {
        const redirectBareDomain = options.redirectBareDomain === "true";
        this.$redirectBareDomain.prop("checked", redirectBareDomain);
        this.$shareRootCheck.toggle(redirectBareDomain);
        if (redirectBareDomain) {
            await this.checkShareRoot();
        }

        this.$showLoginInShareTheme.prop("checked", options.showLoginInShareTheme === "true");
        this.$useCleanUrls.prop("checked", options.useCleanUrls === "true");
        this.$sharePath.val(options.sharePath);
    }

    async checkShareRoot() {
        const $button = this.$widget.find(".check-share-root");
        $button.prop("disabled", true);

        try {
            const shareRootNotes = await searchService.searchForNotes("#shareRoot");
            const sharedShareRootNote = shareRootNotes.find((note) => note.isShared());

            if (sharedShareRootNote) {
                this.$shareRootStatus
                    .removeClass("text-danger")
                    .addClass("text-success")
                    .text(t("share.share_root_found", { noteTitle: sharedShareRootNote.title }));
            } else {
                this.$shareRootStatus
                    .removeClass("text-success")
                    .addClass("text-danger")
                    .text(shareRootNotes.length > 0 ? t("share.share_root_not_shared", { noteTitle: shareRootNotes[0].title }) : t("share.share_root_not_found"));
            }
        } finally {
            $button.prop("disabled", false);
        }
    }

    async save() {
        const redirectBareDomain = this.$redirectBareDomain.is(":checked");
        await this.updateOption<"redirectBareDomain">("redirectBareDomain", redirectBareDomain.toString());

        const showLoginInShareTheme = this.$showLoginInShareTheme.is(":checked");
        await this.updateOption<"showLoginInShareTheme">("showLoginInShareTheme", showLoginInShareTheme.toString());

        const useCleanUrls = this.$useCleanUrls.is(":checked");
        await this.updateOption<"useCleanUrls">("useCleanUrls", useCleanUrls.toString());

        // Ensure sharePath always starts with a slash
        let sharePath = this.$sharePath.val() as string;
        if (sharePath && !sharePath.startsWith('/')) {
            sharePath = '/' + sharePath;
        }
        await this.updateOption<"sharePath">("sharePath", sharePath);
    }
}
