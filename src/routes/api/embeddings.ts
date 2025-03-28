import options from "../../services/options.js";
import vectorStore from "../../services/llm/embeddings/index.js";
import providerManager from "../../services/llm/providers/providers.js";
import indexService from "../../services/llm/index_service.js";
import becca from "../../becca/becca.js";
import type { Request, Response } from "express";
import log from "../../services/log.js";
import sql from "../../services/sql.js";

/**
 * @swagger
 * /api/embeddings/similar/{noteId}:
 *   get:
 *     summary: Find similar notes based on a given note ID
 *     operationId: embeddings-similar-by-note
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: providerId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         default: openai
 *         description: Embedding provider ID
 *       - name: modelId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         default: text-embedding-3-small
 *         description: Embedding model ID
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         default: 10
 *         description: Maximum number of similar notes to return
 *       - name: threshold
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         default: 0.7
 *         description: Similarity threshold (0.0-1.0)
 *     responses:
 *       '200':
 *         description: List of similar notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 similarNotes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       similarity:
 *                         type: number
 *                         format: float
 *       '400':
 *         description: Invalid request parameters
 *       '404':
 *         description: Note not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
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
 * @swagger
 * /api/embeddings/search:
 *   post:
 *     summary: Search for notes similar to provided text
 *     operationId: embeddings-search-by-text
 *     parameters:
 *       - name: providerId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         default: openai
 *         description: Embedding provider ID
 *       - name: modelId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         default: text-embedding-3-small
 *         description: Embedding model ID
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         default: 10
 *         description: Maximum number of similar notes to return
 *       - name: threshold
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         default: 0.7
 *         description: Similarity threshold (0.0-1.0)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to search with
 *     responses:
 *       '200':
 *         description: List of similar notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 similarNotes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       similarity:
 *                         type: number
 *                         format: float
 *       '400':
 *         description: Invalid request parameters
 *     security:
 *       - session: []
 *     tags: ["llm"]
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
 * @swagger
 * /api/embeddings/providers:
 *   get:
 *     summary: Get available embedding providers
 *     operationId: embeddings-get-providers
 *     responses:
 *       '200':
 *         description: List of available embedding providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isEnabled:
 *                         type: boolean
 *                       priority:
 *                         type: integer
 *                       config:
 *                         type: object
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getProviders(req: Request, res: Response) {
    const providerConfigs = await providerManager.getEmbeddingProviderConfigs();

    return {
        success: true,
        providers: providerConfigs
    };
}

/**
 * @swagger
 * /api/embeddings/providers/{providerId}:
 *   patch:
 *     summary: Update embedding provider configuration
 *     operationId: embeddings-update-provider
 *     parameters:
 *       - name: providerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the embedding provider to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isEnabled:
 *                 type: boolean
 *                 description: Whether the provider is enabled
 *               priority:
 *                 type: integer
 *                 description: Priority level for the provider
 *               config:
 *                 type: object
 *                 description: Provider-specific configuration
 *     responses:
 *       '200':
 *         description: Provider successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '404':
 *         description: Provider not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function updateProvider(req: Request, res: Response) {
    const { providerId } = req.params;
    const { isEnabled, priority, config } = req.body;

    const success = await providerManager.updateEmbeddingProviderConfig(
        providerId, isEnabled, priority
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
 * @swagger
 * /api/embeddings/reprocess:
 *   post:
 *     summary: Reprocess all notes for embedding generation
 *     operationId: embeddings-reprocess-all
 *     responses:
 *       '200':
 *         description: Reprocessing started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function reprocessAllNotes(req: Request, res: Response) {
    // Import cls
    const cls = (await import("../../services/cls.js")).default;

    // Start the reprocessing operation in the background
    setTimeout(async () => {
        try {
            // Wrap the operation in cls.init to ensure proper context
            cls.init(async () => {
                await vectorStore.reprocessAllNotes();
                log.info("Embedding reprocessing completed successfully");
            });
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
 * @swagger
 * /api/embeddings/queue-status:
 *   get:
 *     summary: Get status of the embedding generation queue
 *     operationId: embeddings-queue-status
 *     responses:
 *       '200':
 *         description: Queue status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: object
 *                   properties:
 *                     queueCount:
 *                       type: integer
 *                       description: Number of items in the queue
 *                     failedCount:
 *                       type: integer
 *                       description: Number of failed embedding attempts
 *                     totalEmbeddingsCount:
 *                       type: integer
 *                       description: Total number of generated embeddings
 *     security:
 *       - session: []
 *     tags: ["llm"]
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
 * @swagger
 * /api/embeddings/stats:
 *   get:
 *     summary: Get embedding statistics
 *     operationId: embeddings-stats
 *     responses:
 *       '200':
 *         description: Embedding statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalEmbeddings:
 *                       type: integer
 *                     providers:
 *                       type: object
 *                     modelCounts:
 *                       type: object
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getEmbeddingStats(req: Request, res: Response) {
    const stats = await vectorStore.getEmbeddingStats();

    return {
        success: true,
        stats
    };
}

/**
 * @swagger
 * /api/embeddings/failed:
 *   get:
 *     summary: Get list of notes that failed embedding generation
 *     operationId: embeddings-failed-notes
 *     responses:
 *       '200':
 *         description: List of failed embedding notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 failedNotes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       error:
 *                         type: string
 *                       attempts:
 *                         type: integer
 *                       lastAttempt:
 *                         type: string
 *                         format: date-time
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getFailedNotes(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const failedNotes = await vectorStore.getFailedEmbeddingNotes(limit);

    // No need to fetch note titles here anymore as they're already included in the response
    return {
        success: true,
        failedNotes: failedNotes
    };
}

/**
 * @swagger
 * /api/embeddings/retry/{noteId}:
 *   post:
 *     summary: Retry embedding generation for a failed note
 *     operationId: embeddings-retry-note
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the note to retry embedding
 *     responses:
 *       '200':
 *         description: Retry operation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '404':
 *         description: Note not found or not in failed state
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryFailedNote(req: Request, res: Response) {
    const { noteId } = req.params;

    if (!noteId) {
        return [400, {
            success: false,
            message: "Note ID is required"
        }];
    }

    const success = await vectorStore.retryFailedEmbedding(noteId);

    if (!success) {
        return [404, {
            success: false,
            message: "Failed note not found or note is not marked as failed"
        }];
    }

    return {
        success: true,
        message: "Note queued for retry"
    };
}

/**
 * @swagger
 * /api/embeddings/retry-all-failed:
 *   post:
 *     summary: Retry embedding generation for all failed notes
 *     operationId: embeddings-retry-all-failed
 *     responses:
 *       '200':
 *         description: Retry operation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                   description: Number of notes queued for retry
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryAllFailedNotes(req: Request, res: Response) {
    const count = await vectorStore.retryAllFailedEmbeddings();

    return {
        success: true,
        message: `${count} failed notes queued for retry`
    };
}

/**
 * @swagger
 * /api/embeddings/rebuild-index:
 *   post:
 *     summary: Rebuild the embedding vector index
 *     operationId: embeddings-rebuild-index
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 description: Specific provider to rebuild index for
 *               force:
 *                 type: boolean
 *                 description: Force rebuild even if not necessary
 *     responses:
 *       '200':
 *         description: Index rebuild operation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                   description: ID of the rebuild job for status tracking
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function rebuildIndex(req: Request, res: Response) {
    // Start the index rebuilding operation in the background
    setTimeout(async () => {
        try {
            await indexService.startFullIndexing(true);
            log.info("Index rebuilding completed successfully");
        } catch (error: any) {
            log.error(`Error during background index rebuilding: ${error.message || "Unknown error"}`);
        }
    }, 0);

    // Return the response data
    return {
        success: true,
        message: "Index rebuilding started in the background"
    };
}

/**
 * @swagger
 * /api/embeddings/index-rebuild-status:
 *   get:
 *     summary: Get status of the vector index rebuild operation
 *     operationId: embeddings-rebuild-status
 *     parameters:
 *       - name: jobId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional job ID to get status for a specific rebuild job
 *     responses:
 *       '200':
 *         description: Rebuild status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [idle, in_progress, completed, failed]
 *                 progress:
 *                   type: number
 *                   format: float
 *                   description: Progress percentage (0-100)
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     processed:
 *                       type: integer
 *                     total:
 *                       type: integer
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getIndexRebuildStatus(req: Request, res: Response) {
    const status = indexService.getIndexRebuildStatus();

    return {
        success: true,
        status
    };
}

export default {
    findSimilarNotes,
    searchByText,
    getProviders,
    updateProvider,
    reprocessAllNotes,
    getQueueStatus,
    getEmbeddingStats,
    getFailedNotes,
    retryFailedNote,
    retryAllFailedNotes,
    rebuildIndex,
    getIndexRebuildStatus
};
