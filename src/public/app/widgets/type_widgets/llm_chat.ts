import TypeWidget from "./type_widget.js";
import LlmChatPanel from "../llm_chat_panel.js";
import { type EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";

export default class LlmChatTypeWidget extends TypeWidget {
    private llmChatPanel: LlmChatPanel;
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.llmChatPanel = new LlmChatPanel();
    }

    static getType() {
        return "llmChat";
    }

    doRender() {
        this.$widget = $('<div class="llm-chat-widget-container" style="height: 100%;"></div>');
        this.$widget.append(this.llmChatPanel.render());

        return this.$widget;
    }

    async doRefresh(note: FNote | null | undefined) {
        // Initialize only once
        if (!this.isInitialized) {
            console.log("Initializing LLM Chat Panel");
            await this.llmChatPanel.refresh();
            this.isInitialized = true;
        }
    }

    async entitiesReloadedEvent(data: EventData<"entitiesReloaded">) {
        // We don't need to refresh on entities reloaded for the chat
    }

    async activeContextChangedEvent(data: EventData<"activeContextChanged">) {
        // Only refresh when this becomes active and we're not initialized yet
        if (this.isActive() && !this.isInitialized) {
            await this.llmChatPanel.refresh();
            this.isInitialized = true;
        }
    }

    // Handle data saving - we don't need to save anything
    getData() {
        return {};
    }
}
