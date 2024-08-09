import { t } from "../../services/i18n.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";

const TPL = `
<div class="password-not-set-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-md" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title mr-auto">${t("password_not_set.title")}</h5>

                <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="margin-left: 0;">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                ${t("password_not_set.body1")}
                
                ${t("password_not_set.body2")}
            </div>
        </div>
    </div>
</div>
`;

export default class PasswordNoteSetDialog extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$openPasswordOptionsButton = this.$widget.find(".open-password-options-button");
        this.$openPasswordOptionsButton.on("click", () => {
            this.triggerCommand("showOptions", { section: '_optionsPassword' });
        });
    }

    showPasswordNotSetEvent() {
        utils.openDialog(this.$widget);
    }
}
