import log from "../../log.js";
import options from "../../options.js";
import vectorStore from "./vector_store.js";
import providerManager from "./providers.js";

/**
 * Initialize the embedding system
 */
export async function initializeEmbeddings() {
    try {
        log.info("Initializing embedding system...");

        // Initialize default embedding providers
        await providerManager.initializeDefaultProviders();

        // Start the embedding system if AI is enabled
        if (await options.getOptionBool('aiEnabled')) {
            await vectorStore.initEmbeddings();
            log.info("Embedding system initialized successfully.");
        } else {
            log.info("Embedding system disabled (AI features are turned off).");
        }
    } catch (error: any) {
        log.error(`Error initializing embedding system: ${error.message || error}`);
    }
}
