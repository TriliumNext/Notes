import CommandButtonWidget from "./command_button.js";

export default class RightPaneToggleWidget extends CommandButtonWidget {

    constructor() {
        super();

        this.class("toggle-button");
        this.settings.icon = "bx-dock-right";
    }

}
