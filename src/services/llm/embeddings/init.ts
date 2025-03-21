import log from "../../log.js";
import options from "../../options.js";
import { initEmbeddings } from "./index.js";
import providerManager from "./providers.js";
import sqlInit from "../../sql_init.js";
import sql from "../../sql.js";

/**
 * Reset any stuck embedding queue items that were left in processing state
 * from a previous server shutdown
 */
async function resetStuckEmbeddingQueue() {
    try {
        const stuckCount = await sql.getValue(
            "SELECT COUNT(*) FROM embedding_queue WHERE isProcessing = 1"
        ) as number;

        if (stuckCount > 0) {
            log.info(`Resetting ${stuckCount} stuck items in embedding queue from previous shutdown`);

            await sql.execute(
                "UPDATE embedding_queue SET isProcessing = 0 WHERE isProcessing = 1"
            );
        }
    } catch (error: any) {
        log.error(`Error resetting stuck embedding queue: ${error.message || error}`);
    }
}

/**
 * Initialize the embedding system
 */
export async function initializeEmbeddings() {
    try {
        log.info("Initializing embedding system...");

        // Check if the database is initialized before proceeding
        if (!sqlInit.isDbInitialized()) {
            log.info("Skipping embedding system initialization as database is not initialized yet.");
            return;
        }

        // Reset any stuck embedding queue items from previous server shutdown
        await resetStuckEmbeddingQueue();

        // Initialize default embedding providers
        await providerManager.initializeDefaultProviders();

        // Start the embedding system if AI is enabled
        if (await options.getOptionBool('aiEnabled')) {
            await initEmbeddings();
            log.info("Embedding system initialized successfully.");
        } else {
            log.info("Embedding system disabled (AI features are turned off).");
        }
    } catch (error: any) {
        log.error(`Error initializing embedding system: ${error.message || error}`);
    }
}
