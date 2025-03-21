import sql from "../../sql.js";
import { randomString } from "../../../services/utils.js";
import dateUtils from "../../../services/date_utils.js";
import log from "../../log.js";
import { embeddingToBuffer, bufferToEmbedding, cosineSimilarity, enhancedCosineSimilarity, selectOptimalEmbedding, adaptEmbeddingDimensions } from "./vector_utils.js";
import type { EmbeddingResult } from "./types.js";
import entityChangesService from "../../../services/entity_changes.js";
import type { EntityChange } from "../../../services/entity_changes_interface.js";

/**
 * Creates or updates an embedding for a note
 */
export async function storeNoteEmbedding(
    noteId: string,
    providerId: string,
    modelId: string,
    embedding: Float32Array
): Promise<string> {
    const dimension = embedding.length;
    const embeddingBlob = embeddingToBuffer(embedding);
    const now = dateUtils.localNowDateTime();
    const utcNow = dateUtils.utcNowDateTime();

    // Check if an embedding already exists for this note and provider/model
    const existingEmbed = await getEmbeddingForNote(noteId, providerId, modelId);
    let embedId;

    if (existingEmbed) {
        // Update existing embedding
        embedId = existingEmbed.embedId;
        await sql.execute(`
            UPDATE note_embeddings
            SET embedding = ?, dimension = ?, version = version + 1,
                dateModified = ?, utcDateModified = ?
            WHERE embedId = ?`,
            [embeddingBlob, dimension, now, utcNow, embedId]
        );
    } else {
        // Create new embedding
        embedId = randomString(16);
        await sql.execute(`
            INSERT INTO note_embeddings
            (embedId, noteId, providerId, modelId, dimension, embedding,
             dateCreated, utcDateCreated, dateModified, utcDateModified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [embedId, noteId, providerId, modelId, dimension, embeddingBlob,
             now, utcNow, now, utcNow]
        );
    }

    // Create entity change record for syncing
    interface EmbeddingRow {
        embedId: string;
        noteId: string;
        providerId: string;
        modelId: string;
        dimension: number;
        version: number;
        dateCreated: string;
        utcDateCreated: string;
        dateModified: string;
        utcDateModified: string;
    }

    const row = await sql.getRow<EmbeddingRow>(`
        SELECT embedId, noteId, providerId, modelId, dimension, version,
               dateCreated, utcDateCreated, dateModified, utcDateModified
        FROM note_embeddings
        WHERE embedId = ?`,
        [embedId]
    );

    if (row) {
        // Skip the actual embedding data for the hash since it's large
        const ec: EntityChange = {
            entityName: "note_embeddings",
            entityId: embedId,
            hash: `${row.noteId}|${row.providerId}|${row.modelId}|${row.dimension}|${row.version}|${row.utcDateModified}`,
            utcDateChanged: row.utcDateModified,
            isSynced: true,
            isErased: false
        };

        entityChangesService.putEntityChange(ec);
    }

    return embedId;
}

/**
 * Retrieves embedding for a specific note
 */
export async function getEmbeddingForNote(noteId: string, providerId: string, modelId: string): Promise<EmbeddingResult | null> {
    const row = await sql.getRow(`
        SELECT embedId, noteId, providerId, modelId, dimension, embedding, version,
               dateCreated, utcDateCreated, dateModified, utcDateModified
        FROM note_embeddings
        WHERE noteId = ? AND providerId = ? AND modelId = ?`,
        [noteId, providerId, modelId]
    );

    if (!row) {
        return null;
    }

    // Need to cast row to any as it doesn't have type information
    const rowData = row as any;

    return {
        ...rowData,
        embedding: bufferToEmbedding(rowData.embedding, rowData.dimension)
    };
}

// Create an interface that represents the embedding row from the database
interface EmbeddingRow {
    embedId: string;
    noteId: string;
    providerId: string;
    modelId: string;
    dimension: number;
    embedding: Buffer;
    title?: string;
    type?: string;
    mime?: string;
    isDeleted?: number;
}

// Interface for enhanced embedding with query model information
interface EnhancedEmbeddingRow extends EmbeddingRow {
    queryProviderId: string;
    queryModelId: string;
}

/**
 * Finds similar notes based on vector similarity
 */
export async function findSimilarNotes(
    embedding: Float32Array,
    providerId: string,
    modelId: string,
    limit = 10,
    threshold?: number,  // Made optional to use constants
    useFallback = true   // Whether to try other providers if no embeddings found
): Promise<{noteId: string, similarity: number, contentType?: string}[]> {
    // Import constants dynamically to avoid circular dependencies
    const llmModule = await import('../../../routes/api/llm.js');
    // Use a default threshold of 0.65 if not provided
    const actualThreshold = threshold || 0.65;

    try {
        log.info(`Finding similar notes with provider: ${providerId}, model: ${modelId}, dimension: ${embedding.length}, threshold: ${actualThreshold}`);

        // First try to find embeddings for the exact provider and model
        const embeddings = await sql.getRows(`
            SELECT ne.embedId, ne.noteId, ne.providerId, ne.modelId, ne.dimension, ne.embedding,
                 n.isDeleted, n.title, n.type, n.mime
            FROM note_embeddings ne
            JOIN notes n ON ne.noteId = n.noteId
            WHERE ne.providerId = ? AND ne.modelId = ? AND n.isDeleted = 0
        `, [providerId, modelId]) as EmbeddingRow[];

        if (embeddings && embeddings.length > 0) {
            log.info(`Found ${embeddings.length} embeddings for provider ${providerId}, model ${modelId}`);

            // Add query model information to each embedding for cross-model comparison
            const enhancedEmbeddings: EnhancedEmbeddingRow[] = embeddings.map(e => {
                return {
                    embedId: e.embedId,
                    noteId: e.noteId,
                    providerId: e.providerId,
                    modelId: e.modelId,
                    dimension: e.dimension,
                    embedding: e.embedding,
                    title: e.title,
                    type: e.type,
                    mime: e.mime,
                    isDeleted: e.isDeleted,
                    queryProviderId: providerId,
                    queryModelId: modelId
                };
            });

            return await processEmbeddings(embedding, enhancedEmbeddings, actualThreshold, limit);
        }

        // If no embeddings found and fallback is allowed, try other providers
        if (useFallback) {
            log.info(`No embeddings found for ${providerId}/${modelId}, trying fallback providers`);

            // Define the type for embedding metadata
            interface EmbeddingMetadata {
                providerId: string;
                modelId: string;
                count: number;
                dimension: number;
            }

            // Get all available embedding metadata
            const availableEmbeddings = await sql.getRows(`
                SELECT DISTINCT providerId, modelId, COUNT(*) as count, dimension
                FROM note_embeddings
                GROUP BY providerId, modelId
                ORDER BY dimension DESC, count DESC
            `) as EmbeddingMetadata[];

            if (availableEmbeddings.length > 0) {
                log.info(`Available embeddings: ${JSON.stringify(availableEmbeddings.map(e => ({
                    providerId: e.providerId,
                    modelId: e.modelId,
                    count: e.count,
                    dimension: e.dimension
                })))}`);

                // Import the vector utils
                const { selectOptimalEmbedding } = await import('./vector_utils.js');

                // Get user dimension strategy preference
                const options = (await import('../../options.js')).default;
                const dimensionStrategy = await options.getOption('embeddingDimensionStrategy') || 'native';
                log.info(`Using embedding dimension strategy: ${dimensionStrategy}`);

                // Find the best alternative based on highest dimension for 'native' strategy
                if (dimensionStrategy === 'native') {
                    const bestAlternative = selectOptimalEmbedding(availableEmbeddings);

                    if (bestAlternative) {
                        log.info(`Using highest-dimension fallback: ${bestAlternative.providerId}/${bestAlternative.modelId} (${bestAlternative.dimension}D)`);

                        // Get embeddings for this provider/model
                        const alternativeEmbeddings = await sql.getRows(`
                            SELECT ne.embedId, ne.noteId, ne.providerId, ne.modelId, ne.dimension, ne.embedding,
                                n.isDeleted, n.title, n.type, n.mime
                            FROM note_embeddings ne
                            JOIN notes n ON ne.noteId = n.noteId
                            WHERE ne.providerId = ? AND ne.modelId = ? AND n.isDeleted = 0
                        `, [bestAlternative.providerId, bestAlternative.modelId]) as EmbeddingRow[];

                        if (alternativeEmbeddings && alternativeEmbeddings.length > 0) {
                            // Add query model information to each embedding for cross-model comparison
                            const enhancedEmbeddings: EnhancedEmbeddingRow[] = alternativeEmbeddings.map(e => {
                                return {
                                    embedId: e.embedId,
                                    noteId: e.noteId,
                                    providerId: e.providerId,
                                    modelId: e.modelId,
                                    dimension: e.dimension,
                                    embedding: e.embedding,
                                    title: e.title,
                                    type: e.type,
                                    mime: e.mime,
                                    isDeleted: e.isDeleted,
                                    queryProviderId: providerId,
                                    queryModelId: modelId
                                };
                            });

                            return await processEmbeddings(embedding, enhancedEmbeddings, actualThreshold, limit);
                        }
                    }
                } else {
                    // Use dedicated embedding provider precedence from options for other strategies
                    let preferredProviders: string[] = [];
                    const embeddingPrecedence = await options.getOption('embeddingProviderPrecedence');

                    if (embeddingPrecedence) {
                        // For "comma,separated,values"
                        if (embeddingPrecedence.includes(',')) {
                            preferredProviders = embeddingPrecedence.split(',').map(p => p.trim());
                        }
                        // For JSON array ["value1", "value2"]
                        else if (embeddingPrecedence.startsWith('[') && embeddingPrecedence.endsWith(']')) {
                            try {
                                preferredProviders = JSON.parse(embeddingPrecedence);
                            } catch (e) {
                                log.error(`Error parsing embedding precedence: ${e}`);
                                preferredProviders = [embeddingPrecedence]; // Fallback to using as single value
                            }
                        }
                        // For a single value
                        else {
                            preferredProviders = [embeddingPrecedence];
                        }
                    }

                    log.info(`Using provider precedence: ${preferredProviders.join(', ')}`);

                    // Try providers in precedence order
                    for (const provider of preferredProviders) {
                        const providerEmbeddings = availableEmbeddings.filter(e => e.providerId === provider);

                        if (providerEmbeddings.length > 0) {
                            // Choose the model with the most embeddings
                            const bestModel = providerEmbeddings.sort((a, b) => b.count - a.count)[0];
                            log.info(`Found fallback provider: ${provider}, model: ${bestModel.modelId}, dimension: ${bestModel.dimension}`);

                            // The 'regenerate' strategy would go here if needed
                            // We're no longer supporting the 'adapt' strategy
                        }
                    }
                }
            }

            log.info('No suitable fallback embeddings found, returning empty results');
        }

        return [];
    } catch (error) {
        log.error(`Error finding similar notes: ${error}`);
        return [];
    }
}

// Helper function to process embeddings and calculate similarities
async function processEmbeddings(queryEmbedding: Float32Array, embeddings: any[], threshold: number, limit: number) {
    const {
        enhancedCosineSimilarity,
        bufferToEmbedding,
        ContentType,
        PerformanceProfile,
        detectContentType,
        vectorDebugConfig
    } = await import('./vector_utils.js');

    // Store original debug settings but keep debug disabled
    const originalDebugEnabled = vectorDebugConfig.enabled;
    const originalLogLevel = vectorDebugConfig.logLevel;

    // Keep debug disabled for normal operation
    vectorDebugConfig.enabled = false;
    vectorDebugConfig.recordStats = false;

    const similarities = [];

    try {
        for (const e of embeddings) {
            const embVector = bufferToEmbedding(e.embedding, e.dimension);

            // Detect content type from mime type if available
            let contentType = ContentType.GENERAL_TEXT;
            if (e.mime) {
                contentType = detectContentType(e.mime);
                // Debug logging removed to avoid console spam
            }

            // Select performance profile based on embedding size and use case
            // For most similarity searches, BALANCED is a good default
            const performanceProfile = PerformanceProfile.BALANCED;

            // Determine if this is cross-model comparison
            const isCrossModel = e.providerId !== e.queryProviderId || e.modelId !== e.queryModelId;

            // Calculate similarity with content-aware parameters
            const similarity = enhancedCosineSimilarity(
                queryEmbedding,
                embVector,
                true, // normalize vectors to ensure consistent comparison
                e.queryModelId,  // source model ID
                e.modelId,       // target model ID
                contentType,     // content-specific padding strategy
                performanceProfile
            );

            if (similarity >= threshold) {
                similarities.push({
                    noteId: e.noteId,
                    similarity: similarity,
                    contentType: contentType.toString()
                });
            }
        }

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    } finally {
        // Restore original debug settings
        vectorDebugConfig.enabled = originalDebugEnabled;
        vectorDebugConfig.logLevel = originalLogLevel;
    }
}

/**
 * Delete embeddings for a note
 *
 * @param noteId - The ID of the note
 * @param providerId - Optional provider ID to delete embeddings only for a specific provider
 * @param modelId - Optional model ID to delete embeddings only for a specific model
 */
export async function deleteNoteEmbeddings(noteId: string, providerId?: string, modelId?: string) {
    let query = "DELETE FROM note_embeddings WHERE noteId = ?";
    const params: any[] = [noteId];

    if (providerId) {
        query += " AND providerId = ?";
        params.push(providerId);

        if (modelId) {
            query += " AND modelId = ?";
            params.push(modelId);
        }
    }

    await sql.execute(query, params);
}
