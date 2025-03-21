import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import options from "../../services/options.js";
import CommandButtonWidget from "./command_button.js";

export default class LlmChatButton extends CommandButtonWidget {

    constructor(note: FNote) {
        super();

        this.command("showLlmChat")
            .title(() => note.title)
            .icon(() => note.getIcon())
            .class("launcher-button");
    }

    isEnabled() {
        return options.get("aiEnabled") === "true";
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.isOptionReloaded("aiEnabled")) {
            this.refresh();
        }
    }

}
