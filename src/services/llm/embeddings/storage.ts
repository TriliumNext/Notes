import sql from "../../sql.js";
import { randomString } from "../../../services/utils.js";
import dateUtils from "../../../services/date_utils.js";
import log from "../../log.js";
import { embeddingToBuffer, bufferToEmbedding, cosineSimilarity, enhancedCosineSimilarity, selectOptimalEmbedding, adaptEmbeddingDimensions } from "./vector_utils.js";
import type { EmbeddingResult } from "./types.js";
import entityChangesService from "../../../services/entity_changes.js";
import type { EntityChange } from "../../../services/entity_changes_interface.js";
import { EMBEDDING_CONSTANTS } from "../constants/embedding_constants.js";
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

    const options = (await import('../../options.js')).default;

    // Define weighting factors with defaults that can be overridden by settings
    interface SimilarityWeights {
        exactTitleMatch: number;
        titleContainsQuery: number;
        partialTitleMatch: number;
        // Add more weights as needed - examples:
        sameType?: number;
        attributeMatch?: number;
        recentlyCreated?: number;
        recentlyModified?: number;
    }

    // Default weights that match our previous hardcoded values
    const defaultWeights: SimilarityWeights = {
        exactTitleMatch: 0.3,
        titleContainsQuery: 0.2,
        partialTitleMatch: 0.1,
        sameType: 0.05,
        attributeMatch: 0.05,
        recentlyCreated: 0.05,
        recentlyModified: 0.05
    };

    // Get weights from options if they exist
    const weights: SimilarityWeights = { ...defaultWeights };
    try {
        const customWeightsJSON = EMBEDDING_CONSTANTS;
        if (customWeightsJSON) {
            try {
                const customWeights = EMBEDDING_CONSTANTS;
                // Override defaults with any custom weights
                Object.assign(weights, customWeights);
                log.info(`Using custom similarity weights: ${JSON.stringify(weights)}`);
            } catch (e) {
                log.error(`Error parsing custom similarity weights: ${e}`);
            }
        }
    } catch (e) {
        // Use defaults if no custom weights
    }

    /**
     * Calculate similarity bonuses based on various factors
     */
    function calculateSimilarityBonuses(
        embedding: any,
        note: any,
        queryText: string,
        weights: SimilarityWeights
    ): { bonuses: Record<string, number>, totalBonus: number } {
        const bonuses: Record<string, number> = {};

        // Skip if we don't have query text
        if (!queryText || !note.title) {
            return { bonuses, totalBonus: 0 };
        }

        const titleLower = note.title.toLowerCase();
        const queryLower = queryText.toLowerCase();

        // 1. Exact title match
        if (titleLower === queryLower) {
            bonuses.exactTitleMatch = weights.exactTitleMatch;
        }
        // 2. Title contains the entire query
        else if (titleLower.includes(queryLower)) {
            bonuses.titleContainsQuery = weights.titleContainsQuery;
        }
        // 3. Partial term matching
        else {
            // Split query into terms and check if title contains them
            const queryTerms = queryLower.split(/\s+/).filter((term: string) => term.length > 2);
            let matchCount = 0;

            for (const term of queryTerms) {
                if (titleLower.includes(term)) {
                    matchCount++;
                }
            }

            if (matchCount > 0 && queryTerms.length > 0) {
                // Calculate proportion of matching terms and apply a scaled bonus
                const matchProportion = matchCount / queryTerms.length;
                bonuses.partialTitleMatch = weights.partialTitleMatch * matchProportion;
            }
        }

        // 4. Add more factors as needed here
        // Example: Same note type bonus
        // if (note.type && weights.sameType) {
        //     // Note: This would need to be compared with the query context to be meaningful
        //     // For now, this is a placeholder for demonstration
        //     bonuses.sameType = weights.sameType;
        // }

        // Calculate total bonus
        const totalBonus = Object.values(bonuses).reduce((sum, bonus) => sum + bonus, 0);

        return { bonuses, totalBonus };
    }

    const similarities = [];

    try {
        // Try to extract the original query text if it was added to the metadata
        // This will help us determine title matches
        const queryText = queryEmbedding.hasOwnProperty('originalQuery')
            ? (queryEmbedding as any).originalQuery
            : '';

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
            let similarity = enhancedCosineSimilarity(
                queryEmbedding,
                embVector,
                true, // normalize vectors to ensure consistent comparison
                e.queryModelId,  // source model ID
                e.modelId,       // target model ID
                contentType,     // content-specific padding strategy
                performanceProfile
            );

            // Calculate and apply similarity bonuses
            const { bonuses, totalBonus } = calculateSimilarityBonuses(
                queryEmbedding,
                e,
                queryText,
                weights
            );

            if (totalBonus > 0) {
                similarity += totalBonus;

                // Log significant bonuses for debugging
                const significantBonuses = Object.entries(bonuses)
                    .filter(([_, value]) => value >= 0.05)
                    .map(([key, value]) => `${key}: +${value.toFixed(2)}`)
                    .join(', ');

                if (significantBonuses) {
                    log.info(`Added bonuses for note "${e.title}" (${e.noteId}): ${significantBonuses}`);
                }

                // Cap similarity at 1.0 to maintain expected range
                similarity = Math.min(similarity, 1.0);
            }

            if (similarity >= threshold) {
                similarities.push({
                    noteId: e.noteId,
                    similarity: similarity,
                    contentType: contentType.toString(),
                    // Optionally include bonuses for debugging/analysis
                    // bonuses: bonuses
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
