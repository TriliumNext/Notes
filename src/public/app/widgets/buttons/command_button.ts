import type { CommandNames } from "../../components/app_context.js";
import keyboardActionsService, { type Action } from "../../services/keyboard_actions.js";
import AbstractButtonWidget, { type AbstractButtonWidgetSettings } from "./abstract_button.js";
import type { ButtonNoteIdProvider } from "./button_from_note.js";

let actions: Action[];

keyboardActionsService.getActions().then((as) => (actions = as));

// TODO: Is this actually used?
export type ClickHandler = (widget: CommandButtonWidget, e: JQuery.ClickEvent<any, any, any, any>) => void;
type CommandOrCallback = CommandNames | (() => CommandNames);

interface CommandButtonWidgetSettings extends AbstractButtonWidgetSettings {
    command?: CommandOrCallback;
    onClick?: ClickHandler;
    buttonNoteIdProvider?: ButtonNoteIdProvider | null;
}

export default class CommandButtonWidget extends AbstractButtonWidget<CommandButtonWidgetSettings> {
    constructor() {
        super();
        this.settings = {
            titlePlacement: "right",
            title: null,
            icon: null,
            onContextMenu: null
        };
    }

    doRender() {
        super.doRender();

        if (this.settings.command) {
            this.$widget.on("click", () => {
                this.tooltip.hide();

                if (this._command) {
                    this.triggerCommand(this._command);
                }
            });
        } else {
            console.warn(`Button widget '${this.componentId}' has no defined command`, this.settings);
        }
    }

    getTitle() {
        const title = super.getTitle();

        const action = actions.find((act) => act.actionName === this._command);

        if (action && action.effectiveShortcuts.length > 0) {
            return `${title} (${action.effectiveShortcuts.join(", ")})`;
        } else {
            return title;
        }
    }

    onClick(handler: ClickHandler) {
        this.settings.onClick = handler;
        return this;
    }

    command(command: CommandOrCallback) {
        this.settings.command = command;
        return this;
    }

    get _command() {
        return typeof this.settings.command === "function" ? this.settings.command() : this.settings.command;
    }
}
