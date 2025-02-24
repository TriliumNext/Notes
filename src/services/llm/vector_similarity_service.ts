import type { EmbeddingProvider, VectorSimilarityResult, EmbeddingConfig } from './llm_interface.js';
import sql from '../sql.js';
import NotFoundError from '../../errors/not_found_error.js';
import dateUtils from '../date_utils.js';

export class VectorSimilarityService {
    private provider: EmbeddingProvider | null = null;
    private config: EmbeddingConfig | null = null;

    setProvider(provider: EmbeddingProvider) {
        this.provider = provider;
        this.config = provider.getConfig();
    }

    private async ensureProvider() {
        if (!this.provider || !this.config) {
            throw new Error('No embedding provider configured');
        }
    }

    /**
     * Compute cosine similarity between two vectors
     */
    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Generate and store embeddings for a note
     */
    async generateAndStoreEmbeddings(noteId: string, text: string): Promise<string> {
        await this.ensureProvider();
        
        const vector = await this.provider!.generateEmbeddings(text);
        const embeddingId = crypto.randomUUID();
        const now = dateUtils.utcNowDateTime();

        await sql.transactional(async () => {
            // Delete any existing embeddings for this note
            await sql.execute(
                'UPDATE note_embeddings SET isDeleted = 1 WHERE noteId = ?',
                [noteId]
            );

            // Store new embedding
            await sql.execute(`
                INSERT INTO note_embeddings 
                (embeddingId, noteId, model, vector, dimension, utcDateCreated, utcDateModified, isDeleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [embeddingId, noteId, this.config!.model, Buffer.from(vector.buffer), 
                 vector.length, now, now, 0]
            );
        });

        return embeddingId;
    }

    /**
     * Find similar notes using vector similarity search
     */
    async findSimilarNotes(
        queryText: string, 
        options: { 
            limit?: number, 
            minSimilarity?: number,
            includeContent?: boolean 
        } = {}
    ): Promise<VectorSimilarityResult[]> {
        await this.ensureProvider();
        
        const { 
            limit = 10, 
            minSimilarity = 0.7,
            includeContent = false
        } = options;

        // Generate embedding for query text
        const queryVector = await this.provider!.generateEmbeddings(queryText);

        // Get all note embeddings
        const embeddings = await sql.getRows<{
            noteId: string,
            vector: Buffer,
            title?: string,
            content?: string
        }>(`
            SELECT ne.noteId, ne.vector, n.title ${includeContent ? ', n.content' : ''}
            FROM note_embeddings ne
            JOIN notes n ON n.noteId = ne.noteId
            WHERE ne.isDeleted = 0 
            AND ne.model = ? 
            AND ne.dimension = ?`,
            [this.config!.model, queryVector.length]
        );

        // Calculate similarities
        const results: VectorSimilarityResult[] = embeddings
            .map(row => {
                const vector = new Float32Array(row.vector.buffer);
                const similarity = this.cosineSimilarity(queryVector, vector);
                
                return {
                    noteId: row.noteId,
                    similarity,
                    title: row.title,
                    snippet: row.content ? this.generateSnippet(row.content) : undefined
                };
            })
            .filter(result => result.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return results;
    }

    /**
     * Generate a relevant snippet from note content
     */
    private generateSnippet(content: string, maxLength: number = 200): string {
        // Simple snippet generation - could be enhanced with more sophisticated methods
        if (content.length <= maxLength) {
            return content;
        }
        
        return content.substring(0, maxLength - 3) + '...';
    }

    /**
     * Batch process embeddings for multiple notes
     */
    async batchProcessEmbeddings(
        notes: Array<{ noteId: string, text: string }>,
        options: { 
            batchSize?: number,
            onProgress?: (processed: number, total: number) => void 
        } = {}
    ): Promise<void> {
        await this.ensureProvider();
        
        const { 
            batchSize = this.config!.batchSize || 10,
            onProgress 
        } = options;

        // Process in batches
        for (let i = 0; i < notes.length; i += batchSize) {
            const batch = notes.slice(i, i + batchSize);
            const texts = batch.map(n => n.text);
            
            // Generate embeddings for batch
            const vectors = await this.provider!.generateBatchEmbeddings(texts);
            
            // Store embeddings
            await sql.transactional(async () => {
                for (let j = 0; j < batch.length; j++) {
                    const { noteId } = batch[j];
                    const vector = vectors[j];
                    const embeddingId = crypto.randomUUID();
                    const now = dateUtils.utcNowDateTime();

                    // Delete existing embedding
                    await sql.execute(
                        'UPDATE note_embeddings SET isDeleted = 1 WHERE noteId = ?',
                        [noteId]
                    );

                    // Store new embedding
                    await sql.execute(`
                        INSERT INTO note_embeddings 
                        (embeddingId, noteId, model, vector, dimension, utcDateCreated, utcDateModified, isDeleted)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [embeddingId, noteId, this.config!.model, Buffer.from(vector.buffer), 
                         vector.length, now, now, 0]
                    );
                }
            });

            if (onProgress) {
                onProgress(Math.min(i + batchSize, notes.length), notes.length);
            }
        }
    }
} 