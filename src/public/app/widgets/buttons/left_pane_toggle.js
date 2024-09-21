import options from "../../services/options.js";
import splitService from "../../services/resizer.js";
import CommandButtonWidget from "./command_button.js";
import { t } from "../../services/i18n.js";

export default class LeftPaneToggleWidget extends CommandButtonWidget {
    constructor() {
        super();

        this.class("launcher-button");

        this.settings.icon = () => options.is('leftPaneVisible')
            ? "bx-chevrons-left"
            : "bx-chevrons-right";

        this.settings.title = () => options.is('leftPaneVisible')
            ? t("left_pane_toggle.hide_panel")
            : t("left_pane_toggle.show_panel");

        this.settings.command = () => options.is('leftPaneVisible')
            ? "hideLeftPane"
            : "showLeftPane";
    }

    refreshIcon() {
        super.refreshIcon();

        splitService.setupLeftPaneResizer(options.is('leftPaneVisible'));
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.isOptionReloaded("leftPaneVisible")) {
            this.refreshIcon();
        }
    }
}
