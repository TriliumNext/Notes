import TypeWidget from "./type_widget.js";
import LlmChatPanel from "../llm_chat_panel.js";
import { type EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import server from "../../services/server.js";
import toastService from "../../services/toast.js";

export default class AiChatTypeWidget extends TypeWidget {
    private llmChatPanel: LlmChatPanel;
    private isInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        super();
        this.llmChatPanel = new LlmChatPanel();
    }

    static getType() {
        return "aiChat";
    }

    doRender() {
        this.$widget = $('<div class="ai-chat-widget-container" style="height: 100%;"></div>');
        this.$widget.append(this.llmChatPanel.render());

        return this.$widget;
    }

    async doRefresh(note: FNote | null | undefined) {
        try {
            // If we're already initializing, wait for that to complete
            if (this.initPromise) {
                await this.initPromise;
                return;
            }

            // Only initialize once
            if (!this.isInitialized) {
                console.log("Initializing AI Chat Panel for note:", note?.noteId);

                // Create a promise to track initialization
                this.initPromise = (async () => {
                    try {
                        await this.llmChatPanel.refresh();
                        this.isInitialized = true;
                    } catch (e) {
                        console.error("Error initializing LlmChatPanel:", e);
                        toastService.showError("Failed to initialize chat panel. Try reloading.");
                    }
                })();

                await this.initPromise;
                this.initPromise = null;
            }

            // If this is a newly created note, we can initialize the content
            if (note) {
                try {
                    const content = await note.getContent();
                    // Check if content is empty
                    if (!content || content === '{}') {
                        // Initialize with empty chat history
                        await this.saveData({
                            messages: [],
                            title: note.title
                        });
                    }
                } catch (e) {
                    console.error("Error initializing AI Chat note content:", e);
                }
            }
        } catch (e) {
            console.error("Error in doRefresh:", e);
            toastService.showError("Error refreshing chat. Please try again.");
        }
    }

    async entitiesReloadedEvent(data: EventData<"entitiesReloaded">) {
        // We don't need to refresh on entities reloaded for the chat
    }

    async activeContextChangedEvent(data: EventData<"activeContextChanged">) {
        // Only initialize if this becomes active and we're not initialized yet
        if (this.isActive() && !this.isInitialized && !this.initPromise) {
            try {
                this.initPromise = (async () => {
                    try {
                        await this.llmChatPanel.refresh();
                        this.isInitialized = true;
                    } catch (e) {
                        console.error("Error initializing LlmChatPanel:", e);
                    }
                })();

                await this.initPromise;
                this.initPromise = null;
            } catch (e) {
                console.error("Error in activeContextChangedEvent:", e);
            }
        }
    }

    // Save chat data to the note
    async saveData(data: any) {
        if (!this.note) {
            return;
        }

        try {
            await server.put(`notes/${this.note.noteId}/content`, {
                content: JSON.stringify(data, null, 2)
            });
        } catch (e) {
            console.error("Error saving AI Chat data:", e);
            toastService.showError("Failed to save chat data");
        }
    }

    // Get data from the note
    async getData() {
        if (!this.note) {
            return null;
        }

        try {
            const content = await this.note.getContent();

            if (!content) {
                return null;
            }

            return JSON.parse(content as string);
        } catch (e) {
            console.error("Error loading AI Chat data:", e);
            return null;
        }
    }
}
