import { t } from "../../services/i18n.js";
import options from "../../services/options.js";
import CommandButtonWidget from "./command_button.js";

export default class CreateAiChatButton extends CommandButtonWidget {
    constructor() {
        super();

        this.icon("bx bx-bot")
            .title(t("ai.create_new_ai_chat"))
            .titlePlacement("bottom")
            .command("createAiChat")
            .class("icon-action");
    }

    isEnabled() {
        return options.get("aiEnabled") === "true";
    }

    async refreshWithNote() {
        if (this.isEnabled()) {
            this.$widget.show();
        } else {
            this.$widget.hide();
        }
    }
}
