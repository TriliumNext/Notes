import CommandButtonWidget from "./command_button.js";

export default class RightPaneToggleWidget extends CommandButtonWidget {

    constructor() {
        super();

        this.class("toggle-button");
        this.css("transform", "scaleX(-1)");
        this.settings.icon = "bx-sidebar";
        this.settings.command = "toggleRightPane";
    }

}
