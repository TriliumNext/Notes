import options from "../../services/options.js";
import vectorStore from "../../services/llm/embeddings/vector_store.js";
import providerManager from "../../services/llm/embeddings/providers.js";
import becca from "../../becca/becca.js";
import type { Request, Response } from "express";
import log from "../../services/log.js";
import sql from "../../services/sql.js";

/**
 * Get similar notes based on note ID
 */
async function findSimilarNotes(req: Request, res: Response) {
    const noteId = req.params.noteId;
    const providerId = req.query.providerId as string || 'openai';
    const modelId = req.query.modelId as string || 'text-embedding-3-small';
    const limit = parseInt(req.query.limit as string || '10', 10);
    const threshold = parseFloat(req.query.threshold as string || '0.7');

    if (!noteId) {
        return [400, {
            success: false,
            message: "Note ID is required"
        }];
    }

    const embedding = await vectorStore.getEmbeddingForNote(noteId, providerId, modelId);

    if (!embedding) {
        // If no embedding exists for this note yet, generate one
        const note = becca.getNote(noteId);
        if (!note) {
            return [404, {
                success: false,
                message: "Note not found"
            }];
        }

        const context = await vectorStore.getNoteEmbeddingContext(noteId);
        const provider = providerManager.getEmbeddingProvider(providerId);

        if (!provider) {
            return [400, {
                success: false,
                message: `Embedding provider '${providerId}' not found`
            }];
        }

        const newEmbedding = await provider.generateNoteEmbeddings(context);
        await vectorStore.storeNoteEmbedding(noteId, providerId, modelId, newEmbedding);

        const similarNotes = await vectorStore.findSimilarNotes(
            newEmbedding, providerId, modelId, limit, threshold
        );

        return {
            success: true,
            similarNotes
        };
    }

    const similarNotes = await vectorStore.findSimilarNotes(
        embedding.embedding, providerId, modelId, limit, threshold
    );

    return {
        success: true,
        similarNotes
    };
}

/**
 * Search notes by text
 */
async function searchByText(req: Request, res: Response) {
    const { text } = req.body;
    const providerId = req.query.providerId as string || 'openai';
    const modelId = req.query.modelId as string || 'text-embedding-3-small';
    const limit = parseInt(req.query.limit as string || '10', 10);
    const threshold = parseFloat(req.query.threshold as string || '0.7');

    if (!text) {
        return [400, {
            success: false,
            message: "Search text is required"
        }];
    }

    const provider = providerManager.getEmbeddingProvider(providerId);

    if (!provider) {
        return [400, {
            success: false,
            message: `Embedding provider '${providerId}' not found`
        }];
    }

    // Generate embedding for the search text
    const embedding = await provider.generateEmbeddings(text);

    // Find similar notes
    const similarNotes = await vectorStore.findSimilarNotes(
        embedding, providerId, modelId, limit, threshold
    );

    return {
        success: true,
        similarNotes
    };
}

/**
 * Get embedding providers
 */
async function getProviders(req: Request, res: Response) {
    const providerConfigs = await providerManager.getEmbeddingProviderConfigs();

    return {
        success: true,
        providers: providerConfigs
    };
}

/**
 * Update provider configuration
 */
async function updateProvider(req: Request, res: Response) {
    const { providerId } = req.params;
    const { isEnabled, priority, config } = req.body;

    const success = await providerManager.updateEmbeddingProviderConfig(
        providerId, isEnabled, priority, config
    );

    if (!success) {
        return [404, {
            success: false,
            message: "Provider not found"
        }];
    }

    return {
        success: true
    };
}

/**
 * Manually trigger a reprocessing of all notes
 */
async function reprocessAllNotes(req: Request, res: Response) {
    // Start the reprocessing operation in the background
    setTimeout(async () => {
        try {
            await vectorStore.reprocessAllNotes();
            log.info("Embedding reprocessing completed successfully");
        } catch (error: any) {
            log.error(`Error during background embedding reprocessing: ${error.message || "Unknown error"}`);
        }
    }, 0);

    // Return the response data
    return {
        success: true,
        message: "Embedding reprocessing started in the background"
    };
}

/**
 * Get embedding queue status
 */
async function getQueueStatus(req: Request, res: Response) {
    // Use the imported sql instead of requiring it
    const queueCount = await sql.getValue(
        "SELECT COUNT(*) FROM embedding_queue"
    );

    const failedCount = await sql.getValue(
        "SELECT COUNT(*) FROM embedding_queue WHERE attempts > 0"
    );

    const totalEmbeddingsCount = await sql.getValue(
        "SELECT COUNT(*) FROM note_embeddings"
    );

    return {
        success: true,
        status: {
            queueCount,
            failedCount,
            totalEmbeddingsCount
        }
    };
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats(req: Request, res: Response) {
    const stats = await vectorStore.getEmbeddingStats();

    return {
        success: true,
        stats
    };
}

export default {
    findSimilarNotes,
    searchByText,
    getProviders,
    updateProvider,
    reprocessAllNotes,
    getQueueStatus,
    getEmbeddingStats
};
