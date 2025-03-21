import fs from "fs";
import log from "../../log.js";
import sql from "../../sql.js";
import { randomString } from "../../../services/utils.js";
import dateUtils from "../../../services/date_utils.js";
import entityChangesService from "../../../services/entity_changes.js";
import type { EntityChange } from "../../../services/entity_changes_interface.js";
import options from "../../options.js";
import { embeddingToBuffer, bufferToEmbedding } from "./vector_utils.js";
import type { EmbeddingResult } from "./types.js";

const DEFAULT_SIMILARITY_THRESHOLD = 0.65;

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
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, with 1 being identical vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
        throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
        return 0; // Handle zero vectors
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate similarities between embedding and all stored embeddings
 * Returns notes sorted by similarity, filtered by threshold
 */
function calculateSimilarities(
    embeddings: any[],
    queryEmbedding: Float32Array,
    limit: number,
    threshold: number
): {noteId: string, similarity: number, contentType?: string}[] {
    const results: {noteId: string, similarity: number, contentType?: string}[] = [];

    for (const row of embeddings) {
        try {
            // Parse embedding vector from storage
            const storedVector = Float32Array.from(JSON.parse(row.vector));

            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, storedVector);

            // Add to results if above threshold
            if (similarity >= threshold) {
                results.push({
                    noteId: row.noteId,
                    similarity: similarity,
                    contentType: row.contentType
                });
            }
        } catch (err) {
            log.error(`Error processing embedding for note ${row.noteId}: ${err}`);
        }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    return results.slice(0, limit);
}

/**
 * Resize an embedding to a new dimension
 * For increasing dimensions, pads with zeros
 * For decreasing dimensions, truncates
 */
function resizeEmbedding(embedding: Float32Array, newDimension: number): Float32Array {
    const result = new Float32Array(newDimension);

    // Fill with values from original embedding up to min length
    const minDimension = Math.min(embedding.length, newDimension);
    for (let i = 0; i < minDimension; i++) {
        result[i] = embedding[i];
    }

    // If expanding, remaining values are already 0
    return result;
}

/**
 * Finds similar notes based on vector similarity
 */
export async function findSimilarNotes(
    embedding: Float32Array,
    providerId: string,
    modelId: string,
    limit = 10,
    threshold?: number  // Made optional to use constants
): Promise<{noteId: string, similarity: number, contentType?: string}[]> {
    // Use supplied threshold or default
    threshold = threshold ?? DEFAULT_SIMILARITY_THRESHOLD;

    // Track execution time
    const startTime = Date.now();

    try {
        // Get dimension count
        const dimension = embedding.length;

        // Find embeddings for this provider and model
        const embeddings = await sql.getRows(`
            SELECT noteId, vector, contentType
            FROM note_embeddings
            WHERE providerId = ? AND modelId = ? AND dimension = ?
        `, [providerId, modelId, dimension]);

        // If we found embeddings for this provider/model, use them
        if (embeddings.length > 0) {
            log.info(`Found ${embeddings.length} embeddings for ${providerId}/${modelId}`);

            // Calculate similarities
            const results = calculateSimilarities(embeddings, embedding, limit, threshold);

            const endTime = Date.now();
            log.info(`Found ${results.length} similar notes in ${endTime - startTime}ms`);

            return results;
        }

        // If no embeddings found for this provider/model, check other models from the same provider
        // with the same dimension
        log.info(`No embeddings found for ${providerId}/${modelId} with dimension ${dimension}`);

        // Query other models from this provider with matching dimension
        const alternatives = await sql.getRows(`
            SELECT DISTINCT modelId, dimension
            FROM note_embeddings
            WHERE providerId = ? AND dimension = ?
            LIMIT 5
        `, [providerId, dimension]);

        if (alternatives.length > 0) {
            log.info(`Found alternative models from ${providerId}: ${alternatives.map((a: any) => a.modelId).join(', ')}`);

            // Use the first alternative
            const alt = alternatives[0] as any;
            log.info(`Using alternative model: ${alt.modelId}`);

            // Get embeddings for the alternative model
            const altEmbeddings = await sql.getRows(`
                SELECT noteId, vector, contentType
                FROM note_embeddings
                WHERE providerId = ? AND modelId = ? AND dimension = ?
            `, [providerId, alt.modelId, alt.dimension]);

            if (altEmbeddings.length > 0) {
                log.info(`Found ${altEmbeddings.length} embeddings for ${providerId}/${alt.modelId}`);

                // Calculate similarities
                const results = calculateSimilarities(altEmbeddings, embedding, limit, threshold);

                const endTime = Date.now();
                log.info(`Found ${results.length} similar notes in ${endTime - startTime}ms`);

                return results;
            }
        }

        // If still no embeddings, check embeddings precedence list
        const embeddingPrecedence = await options.getOption('embeddingProviderPrecedence');
        let preferredProviders: string[] = [];

        if (embeddingPrecedence) {
            // Parse as a comma-separated list
            if (embeddingPrecedence.includes(',')) {
                preferredProviders = embeddingPrecedence.split(',').map(p => p.trim());
            } else {
                preferredProviders = [embeddingPrecedence];
            }

            log.info(`Using provider precedence: ${preferredProviders.join(', ')}`);

            // Try each provider from the precedence list
            for (const providerName of preferredProviders) {
                if (providerName === providerId) continue; // Skip current provider

                // Find best model from this provider
                const bestModels = await sql.getRows(`
                    SELECT modelId, dimension, COUNT(*) as count
                    FROM note_embeddings
                    WHERE providerId = ?
                    GROUP BY modelId, dimension
                    ORDER BY count DESC, dimension DESC
                    LIMIT 1
                `, [providerName]);

                if (bestModels.length > 0) {
                    const bestModel = bestModels[0] as any;
                    log.info(`Found provider: ${providerName}, model: ${bestModel.modelId}, dimension: ${bestModel.dimension}`);

                    // Get embeddings for this provider and model
                    const altEmbeddings = await sql.getRows(`
                        SELECT noteId, vector, contentType
                        FROM note_embeddings
                        WHERE providerId = ? AND modelId = ? AND dimension = ?
                    `, [providerName, bestModel.modelId, bestModel.dimension]);

                    if (altEmbeddings.length > 0) {
                        log.info(`Found ${altEmbeddings.length} embeddings for ${providerName}/${bestModel.modelId}`);

                        // Need to resize embedding if dimensions don't match
                        let resizedEmbedding = embedding;
                        if (embedding.length !== bestModel.dimension) {
                            resizedEmbedding = resizeEmbedding(embedding, bestModel.dimension);
                        }

                        // Calculate similarities
                        const results = calculateSimilarities(altEmbeddings, resizedEmbedding, limit, threshold);

                        const endTime = Date.now();
                        log.info(`Found ${results.length} similar notes in ${endTime - startTime}ms`);

                        return results;
                    }
                }
            }
        }

        // If we get here, no embeddings were found at all
        log.info('No suitable embeddings found, returning empty results');
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
