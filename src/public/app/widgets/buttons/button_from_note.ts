import froca from "../../services/froca.js";
import attributeService from "../../services/attributes.js";
import CommandButtonWidget from "./command_button.js";
import type { EventData } from "../../components/app_context.js";

export type ButtonNoteIdProvider = () => string;

export default class ButtonFromNoteWidget extends CommandButtonWidget {

    constructor() {
        super();

        this.settings.buttonNoteIdProvider = null;
    }

    buttonNoteIdProvider(provider: ButtonNoteIdProvider) {
        this.settings.buttonNoteIdProvider = provider;
        return this;
    }

    doRender() {
        super.doRender();

        this.updateIcon();
    }

    updateIcon() {
        if (!this.settings.buttonNoteIdProvider) {
            console.error(`buttonNoteId for '${this.componentId}' is not defined.`);
            return;
        }

        const buttonNoteId = this.settings.buttonNoteIdProvider();

        if (!buttonNoteId) {
            console.error(`buttonNoteId for '${this.componentId}' is not defined.`);
            return;
        }

        froca.getNote(buttonNoteId).then((note) => {
            const icon = note?.getIcon();
            if (icon) {
                this.settings.icon = icon;
            }

            this.refreshIcon();
        });
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        // TODO: this seems incorrect
        //@ts-ignore
        const buttonNote = froca.getNoteFromCache(this.buttonNoteIdProvider());

        if (!buttonNote) {
            return;
        }

        if (loadResults.getAttributeRows(this.componentId).find((attr) => attr.type === "label" && attr.name === "iconClass" && attributeService.isAffecting(attr, buttonNote))) {
            this.updateIcon();
        }
    }
}
