import splitService from "../../services/resizer.js";
import options from "../../services/options.js";
import CommandButtonWidget from "./command_button.js";
import type { EventData } from "../../components/app_context.js";

export default class RightPaneToggleWidget extends CommandButtonWidget {

    constructor() {
        super();

        this.class("toggle-button");
        this.css("transform", "scaleX(-1)");
        this.settings.icon = "bx-sidebar";
        this.settings.command = "toggleRightPane";
    }

    refreshIcon(): void {
        super.refreshIcon();

        splitService.setupRightPaneResizer(options.is("rightPaneVisible"));
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.isOptionReloaded("rightPaneVisible")) {
            this.refreshIcon();
        }
    }

}
