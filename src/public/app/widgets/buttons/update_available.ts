import { t } from "../../services/i18n.js";
import BasicWidget from "../basic_widget.js";
import utils from "../../services/utils.js";

const TPL = /*html*/`
<div style="display: none;">
    <style>
        .global-menu-button-update-available-button {
            width: 21px !important;
            height: 21px !important;
            padding: 0 !important;

            border-radius: var(--button-border-radius);
            transform: scale(0.9);
            border: none;
            opacity: 0.8;

            display: flex;
            align-items: center;
            justify-content: center;
        }

        .global-menu-button-wrapper:hover .global-menu-button-update-available-button {
            opacity: 1;
        }
    </style>

    <span class="bx bx-sync global-menu-button-update-available-button" title="${t("update_available.update_available")}"></span>
</div>
`;

export default class UpdateAvailableWidget extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
    }

    updateVersionStatus(latestVersion: string) {
        this.$widget.toggle(utils.isUpdateAvailable(latestVersion, glob.triliumVersion));
    }
}
