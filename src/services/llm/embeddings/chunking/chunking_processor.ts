import log from "../../../log.js";
import dateUtils from "../../../date_utils.js";
import sql from "../../../sql.js";
import becca from "../../../../becca/becca.js";
import cls from "../../../../services/cls.js";
import type { NoteEmbeddingContext } from "../types.js";
// Remove static imports that cause circular dependencies
// import { storeNoteEmbedding, deleteNoteEmbeddings } from "./storage.js";

// Define error categories for better handling
const ERROR_CATEGORIES = {
    // Temporary errors that should be retried
    TEMPORARY: {
        patterns: [
            'timeout', 'connection', 'network', 'rate limit', 'try again',
            'service unavailable', 'too many requests', 'server error',
            'gateway', 'temporarily', 'overloaded'
        ]
    },
    // Permanent errors that should not be retried
    PERMANENT: {
        patterns: [
            'invalid request', 'invalid content', 'not found', 'unsupported model',
            'invalid model', 'content policy', 'forbidden', 'unauthorized',
            'token limit', 'context length', 'too long', 'content violation'
        ]
    }
};

// Maximum time (in milliseconds) allowed for the entire chunking process
const MAX_TOTAL_PROCESSING_TIME = 5 * 60 * 1000; // 5 minutes

// Maximum number of retry attempts per chunk
const MAX_CHUNK_RETRY_ATTEMPTS = 2;

// Maximum time per chunk processing (to prevent individual chunks from hanging)
const DEFAULT_MAX_CHUNK_PROCESSING_TIME = 60 * 1000; // 1 minute
const OLLAMA_MAX_CHUNK_PROCESSING_TIME = 120 * 1000; // 2 minutes

/**
 * Categorize an error as temporary or permanent based on its message
 * @param errorMessage - The error message to categorize
 * @returns 'temporary', 'permanent', or 'unknown'
 */
function categorizeError(errorMessage: string): 'temporary' | 'permanent' | 'unknown' {
    const lowerCaseMessage = errorMessage.toLowerCase();

    // Check for temporary error patterns
    for (const pattern of ERROR_CATEGORIES.TEMPORARY.patterns) {
        if (lowerCaseMessage.includes(pattern.toLowerCase())) {
            return 'temporary';
        }
    }

    // Check for permanent error patterns
    for (const pattern of ERROR_CATEGORIES.PERMANENT.patterns) {
        if (lowerCaseMessage.includes(pattern.toLowerCase())) {
            return 'permanent';
        }
    }

    // Default to unknown
    return 'unknown';
}

/**
 * Process a chunk with a timeout to prevent hanging
 * @param provider - The embedding provider
 * @param chunk - The chunk to process
 * @param timeoutMs - Timeout in milliseconds
 * @returns The generated embedding
 */
async function processChunkWithTimeout(provider: any, chunk: any, timeoutMs: number): Promise<any> {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Chunk processing timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    // Create the actual processing promise
    const processingPromise = provider.generateEmbeddings(chunk.content);

    // Race the two promises - whichever completes/rejects first wins
    return Promise.race([processingPromise, timeoutPromise]);
}

/**
 * Process a large note by breaking it into chunks and creating embeddings for each chunk
 * This provides more detailed and focused embeddings for different parts of large notes
 *
 * @param noteId - The ID of the note to process
 * @param provider - The embedding provider to use
 * @param context - The note context data
 */
export async function processNoteWithChunking(
    noteId: string,
    provider: any,
    context: NoteEmbeddingContext
): Promise<void> {
    // Track the overall start time
    const startTime = Date.now();

    try {
        // Get the context extractor dynamically to avoid circular dependencies
        const { ContextExtractor } = await import('../../context/index.js');
        const contextExtractor = new ContextExtractor();

        // Get note from becca
        const note = becca.notes[noteId];
        if (!note) {
            throw new Error(`Note ${noteId} not found in Becca cache`);
        }

        // Use semantic chunking for better boundaries
        const chunks = await contextExtractor.semanticChunking(
            context.content,
            note.title,
            noteId,
            {
                // Adjust chunk size based on provider using constants
                maxChunkSize: provider.name === 'ollama' ?
                    (await import('../../../../routes/api/llm.js')).LLM_CONSTANTS.CHUNKING.OLLAMA_SIZE :
                    (await import('../../../../routes/api/llm.js')).LLM_CONSTANTS.CHUNKING.DEFAULT_SIZE,
                respectBoundaries: true
            }
        );

        if (!chunks || chunks.length === 0) {
            // Fall back to single embedding if chunking fails
            await cls.init(async () => {
                const embedding = await provider.generateEmbeddings(context.content);
                const config = provider.getConfig();

                // Use dynamic import instead of static import
                const storage = await import('../storage.js');
                await storage.storeNoteEmbedding(noteId, provider.name, config.model, embedding);
            });

            log.info(`Generated single embedding for note ${noteId} (${note.title}) since chunking failed`);
            return;
        }

        // Generate and store embeddings for each chunk
        const config = provider.getConfig();

        // Delete existing embeddings first to avoid duplicates
        // Use dynamic import
        const storage = await import('../storage.js');
        await storage.deleteNoteEmbeddings(noteId, provider.name, config.model);

        // Track successful and failed chunks in memory during this processing run
        let successfulChunks = 0;
        let failedChunks = 0;
        const totalChunks = chunks.length;
        const failedChunkDetails: {
            index: number,
            error: string,
            category: 'temporary' | 'permanent' | 'unknown',
            attempts: number
        }[] = [];
        const retryQueue: {
            index: number,
            chunk: any,
            attempts: number
        }[] = [];

        log.info(`Processing ${chunks.length} chunks for note ${noteId} (${note.title})`);

        // Get the current time to prevent duplicate processing from timeouts
        const processingStartTime = Date.now();
        const processingId = `${noteId}-${processingStartTime}`;
        log.info(`Starting processing run ${processingId}`);

        // Process each chunk with a delay based on provider to avoid rate limits
        for (let i = 0; i < chunks.length; i++) {
            // Check if we've exceeded the overall time limit
            if (Date.now() - startTime > MAX_TOTAL_PROCESSING_TIME) {
                log.info(`Exceeded maximum processing time (${MAX_TOTAL_PROCESSING_TIME}ms) for note ${noteId}, stopping after ${i} chunks`);

                // Mark remaining chunks as failed due to timeout
                for (let j = i; j < chunks.length; j++) {
                    failedChunks++;
                    failedChunkDetails.push({
                        index: j + 1,
                        error: "Processing timeout - exceeded total allowed time",
                        category: 'temporary',
                        attempts: 1
                    });
                }

                // Break the loop, we'll handle this as partial success if some chunks succeeded
                break;
            }

            const chunk = chunks[i];
            try {
                // Generate embedding for this chunk's content with a timeout
                await cls.init(async () => {
                    const embedding = await processChunkWithTimeout(
                        provider,
                        chunk,
                        provider.name === 'ollama' ? OLLAMA_MAX_CHUNK_PROCESSING_TIME : DEFAULT_MAX_CHUNK_PROCESSING_TIME
                    );

                    // Store with chunk information in a unique ID format
                    const chunkIdSuffix = `${i + 1}_of_${chunks.length}`;
                    await storage.storeNoteEmbedding(
                        noteId,
                        provider.name,
                        config.model,
                        embedding
                    );
                });

                successfulChunks++;

                // Small delay between chunks to avoid rate limits - longer for Ollama
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve,
                        provider.name === 'ollama' ? 2000 : 100));
                }
            } catch (error: any) {
                const errorMessage = error.message || 'Unknown error';
                const errorCategory = categorizeError(errorMessage);

                // Track the failure for this specific chunk
                failedChunks++;
                failedChunkDetails.push({
                    index: i + 1,
                    error: errorMessage,
                    category: errorCategory,
                    attempts: 1
                });

                // Only add to retry queue if not a permanent error
                if (errorCategory !== 'permanent') {
                    retryQueue.push({
                        index: i,
                        chunk: chunk,
                        attempts: 1
                    });
                } else {
                    log.info(`Chunk ${i + 1} for note ${noteId} has permanent error, skipping retries: ${errorMessage}`);
                }

                log.error(`Error processing chunk ${i + 1} for note ${noteId} (${errorCategory} error): ${errorMessage}`);
            }
        }

        // Set a time limit for the retry phase
        const retryStartTime = Date.now();
        const MAX_RETRY_TIME = 2 * 60 * 1000; // 2 minutes for all retries

        // Retry failed chunks with exponential backoff, but only those that aren't permanent errors
        if (retryQueue.length > 0 && retryQueue.length < chunks.length) {
            log.info(`Retrying ${retryQueue.length} failed chunks for note ${noteId}`);

            for (let j = 0; j < retryQueue.length; j++) {
                // Check if we've exceeded the retry time limit
                if (Date.now() - retryStartTime > MAX_RETRY_TIME) {
                    log.info(`Exceeded maximum retry time (${MAX_RETRY_TIME}ms) for note ${noteId}, stopping after ${j} retries`);
                    break;
                }

                const item = retryQueue[j];

                // Skip if we've already reached the max retry attempts for this chunk
                if (item.attempts >= MAX_CHUNK_RETRY_ATTEMPTS) {
                    log.info(`Skipping chunk ${item.index + 1} for note ${noteId} as it reached maximum retry attempts (${MAX_CHUNK_RETRY_ATTEMPTS})`);
                    continue;
                }

                try {
                    // Wait longer for retries with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, j)));

                    // Retry the embedding with timeout using cls.init
                    await cls.init(async () => {
                        const embedding = await processChunkWithTimeout(
                            provider,
                            item.chunk,
                            provider.name === 'ollama' ? OLLAMA_MAX_CHUNK_PROCESSING_TIME : DEFAULT_MAX_CHUNK_PROCESSING_TIME
                        );

                        // Store with unique ID that indicates it was a retry
                        const chunkIdSuffix = `${item.index + 1}_of_${chunks.length}`;
                        const storage = await import('../storage.js');
                        await storage.storeNoteEmbedding(
                            noteId,
                            provider.name,
                            config.model,
                            embedding
                        );
                    });

                    // Update counters
                    successfulChunks++;
                    failedChunks--;

                    // Remove from failedChunkDetails
                    const detailIndex = failedChunkDetails.findIndex(d => d.index === item.index + 1);
                    if (detailIndex >= 0) {
                        failedChunkDetails.splice(detailIndex, 1);
                    }

                    log.info(`Successfully retried chunk ${item.index + 1} for note ${noteId} on attempt ${item.attempts + 1}`);
                } catch (error: any) {
                    const errorMessage = error.message || 'Unknown error';
                    const errorCategory = categorizeError(errorMessage);

                    // Update failure record with new attempt count
                    const detailIndex = failedChunkDetails.findIndex(d => d.index === item.index + 1);
                    if (detailIndex >= 0) {
                        failedChunkDetails[detailIndex].attempts++;
                        failedChunkDetails[detailIndex].error = errorMessage;
                        failedChunkDetails[detailIndex].category = errorCategory;
                    }

                    log.error(`Retry failed for chunk ${item.index + 1} of note ${noteId} (${errorCategory} error): ${errorMessage}`);

                    // For timeout errors, mark as permanent to avoid further retries
                    if (errorMessage.includes('timed out')) {
                        if (detailIndex >= 0) {
                            failedChunkDetails[detailIndex].category = 'permanent';
                        }
                        log.info(`Chunk ${item.index + 1} for note ${noteId} timed out, marking as permanent failure`);
                    }
                    // Add to retry queue again only if it's not a permanent error and hasn't reached the max attempts
                    else if (errorCategory !== 'permanent' && item.attempts + 1 < MAX_CHUNK_RETRY_ATTEMPTS) {
                        // If we're still below MAX_CHUNK_RETRY_ATTEMPTS, we'll try again in the next cycle
                        item.attempts++;
                    } else if (errorCategory === 'permanent') {
                        log.info(`Chunk ${item.index + 1} for note ${noteId} will not be retried further due to permanent error`);
                    } else {
                        log.info(`Chunk ${item.index + 1} for note ${noteId} reached maximum retry attempts (${MAX_CHUNK_RETRY_ATTEMPTS})`);
                    }
                }
            }
        }

        // Log information about the processed chunks
        if (successfulChunks > 0) {
            log.info(`[${processingId}] Generated ${successfulChunks} chunk embeddings for note ${noteId} (${note.title})`);
        }

        if (failedChunks > 0) {
            // Count permanent vs temporary errors
            const permanentErrors = failedChunkDetails.filter(d => d.category === 'permanent').length;
            const temporaryErrors = failedChunkDetails.filter(d => d.category === 'temporary').length;
            const unknownErrors = failedChunkDetails.filter(d => d.category === 'unknown').length;

            log.info(`[${processingId}] Failed to generate ${failedChunks} chunk embeddings for note ${noteId} (${note.title}). ` +
                    `Permanent: ${permanentErrors}, Temporary: ${temporaryErrors}, Unknown: ${unknownErrors}`);
        }

        // Calculate the failure ratio
        const failureRatio = failedChunks / totalChunks;

        // If no chunks were successfully processed, or if more than 50% failed, mark the entire note as failed
        if (successfulChunks === 0 || failureRatio > 0.5) {
            // Check if all failures are permanent
            const allPermanent = failedChunkDetails.every(d => d.category === 'permanent');
            const errorType = allPermanent ? 'permanent' : (failureRatio > 0.5 ? 'too_many_failures' : 'all_failed');

            // Mark this note as failed in the embedding_queue table with a permanent error status
            const now = dateUtils.utcNowDateTime();
            const errorSummary = `Note embedding failed: ${failedChunks}/${totalChunks} chunks failed (${errorType}). First error: ${failedChunkDetails[0]?.error}`;

            await sql.execute(`
                UPDATE embedding_queue
                SET error = ?, lastAttempt = ?, attempts = 999
                WHERE noteId = ?
            `, [errorSummary, now, noteId]);

            throw new Error(errorSummary);
        }

        // If some chunks failed but others succeeded, log a warning but consider the processing complete
        // The note will be removed from the queue, but we'll store error information
        if (failedChunks > 0 && successfulChunks > 0) {
            // Create detailed error summary
            const permanentErrors = failedChunkDetails.filter(d => d.category === 'permanent').length;
            const temporaryErrors = failedChunkDetails.filter(d => d.category === 'temporary').length;
            const unknownErrors = failedChunkDetails.filter(d => d.category === 'unknown').length;

            const errorSummary = `Note processed partially: ${successfulChunks}/${totalChunks} chunks succeeded, ` +
                               `${failedChunks}/${totalChunks} failed (${permanentErrors} permanent, ${temporaryErrors} temporary, ${unknownErrors} unknown)`;
            log.info(errorSummary);

            // Store a summary in the error field of embedding_queue
            // This is just for informational purposes - the note will be removed from the queue
            const now = dateUtils.utcNowDateTime();
            await sql.execute(`
                UPDATE embedding_queue
                SET error = ?, lastAttempt = ?
                WHERE noteId = ?
            `, [errorSummary, now, noteId]);
        }

        // Track total processing time
        const totalTime = Date.now() - startTime;
        log.info(`[${processingId}] Total processing time for note ${noteId}: ${totalTime}ms`);

    } catch (error: any) {
        log.error(`Error in chunked embedding process for note ${noteId}: ${error.message || 'Unknown error'}`);
        throw error;
    }
}
