import type { EmbeddingProvider, EmbeddingConfig, NoteEmbeddingContext } from './embeddings_interface.js';
import { NormalizationStatus } from './embeddings_interface.js';
import log from "../../log.js";
import { LLM_CONSTANTS } from "../../../routes/api/llm.js";
import options from "../../options.js";

/**
 * Base class that implements common functionality for embedding providers
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
    name: string = "base";
    protected config: EmbeddingConfig;
    protected apiKey?: string;
    protected baseUrl: string;
    protected modelInfoCache = new Map<string, any>();

    constructor(config: EmbeddingConfig) {
        this.config = config;
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || "";
    }

    getConfig(): EmbeddingConfig {
        return { ...this.config };
    }

    /**
     * Get the normalization status of this provider
     * Default implementation returns the status from config if available,
     * otherwise returns UNKNOWN status
     */
    getNormalizationStatus(): NormalizationStatus {
        return this.config.normalizationStatus || NormalizationStatus.UNKNOWN;
    }

    getDimension(): number {
        return this.config.dimension;
    }

    async initialize(): Promise<void> {
        // Default implementation does nothing
        return;
    }

    /**
     * Generate embeddings for a single text
     */
    abstract generateEmbeddings(text: string): Promise<Float32Array>;

    /**
     * Get the appropriate batch size for this provider
     * Override in provider implementations if needed
     */
    protected async getBatchSize(): Promise<number> {
        // Try to get the user-configured batch size
        let configuredBatchSize: number | null = null;

        try {
            const batchSizeStr = await options.getOption('embeddingBatchSize');
            if (batchSizeStr) {
                configuredBatchSize = parseInt(batchSizeStr, 10);
            }
        } catch (error) {
            log.error(`Error getting batch size from options: ${error}`);
        }

        // If user has configured a specific batch size, use that
        if (configuredBatchSize && !isNaN(configuredBatchSize) && configuredBatchSize > 0) {
            return configuredBatchSize;
        }

        // Otherwise use the provider-specific default from constants
        return this.config.batchSize ||
               LLM_CONSTANTS.BATCH_SIZE[this.name.toUpperCase() as keyof typeof LLM_CONSTANTS.BATCH_SIZE] ||
               LLM_CONSTANTS.BATCH_SIZE.DEFAULT;
    }

    /**
     * Process a batch of texts with adaptive handling
     * This method will try to process the batch and reduce batch size if encountering errors
     */
    protected async processWithAdaptiveBatch<T>(
        items: T[],
        processFn: (batch: T[]) => Promise<any[]>,
        isBatchSizeError: (error: any) => boolean
    ): Promise<any[]> {
        const results: any[] = [];
        const failures: { index: number, error: string }[] = [];
        let currentBatchSize = await this.getBatchSize();
        let lastError: Error | null = null;

        // Process items in batches
        for (let i = 0; i < items.length;) {
            const batch = items.slice(i, i + currentBatchSize);

            try {
                // Process the current batch
                const batchResults = await processFn(batch);
                results.push(...batchResults);
                i += batch.length;
            }
            catch (error: any) {
                lastError = error;
                const errorMessage = error.message || 'Unknown error';

                // Check if this is a batch size related error
                if (isBatchSizeError(error) && currentBatchSize > 1) {
                    // Reduce batch size and retry
                    const newBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                    console.warn(`Batch size error detected, reducing batch size from ${currentBatchSize} to ${newBatchSize}: ${errorMessage}`);
                    currentBatchSize = newBatchSize;
                }
                else if (currentBatchSize === 1) {
                    // If we're already at batch size 1, we can't reduce further, so log the error and skip this item
                    log.error(`Error processing item at index ${i} with batch size 1: ${errorMessage}`);
                    failures.push({ index: i, error: errorMessage });
                    i++; // Move to the next item
                }
                else {
                    // For other errors, retry with a smaller batch size as a precaution
                    const newBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                    console.warn(`Error processing batch, reducing batch size from ${currentBatchSize} to ${newBatchSize} as a precaution: ${errorMessage}`);
                    currentBatchSize = newBatchSize;
                }
            }
        }

        // If all items failed and we have a last error, throw it
        if (results.length === 0 && failures.length > 0 && lastError) {
            throw lastError;
        }

        // If some items failed but others succeeded, log the summary
        if (failures.length > 0) {
            console.warn(`Processed ${results.length} items successfully, but ${failures.length} items failed`);
        }

        return results;
    }

    /**
     * Detect if an error is related to batch size limits
     * Override in provider-specific implementations
     */
    protected isBatchSizeError(error: any): boolean {
        const errorMessage = error?.message || '';
        const batchSizeErrorPatterns = [
            'batch size', 'too many items', 'too many inputs',
            'input too large', 'payload too large', 'context length',
            'token limit', 'rate limit', 'request too large'
        ];

        return batchSizeErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Generate embeddings for multiple texts
     * Default implementation processes texts one by one
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        try {
            return await this.processWithAdaptiveBatch(
                texts,
                async (batch) => {
                    const batchResults = await Promise.all(
                        batch.map(text => this.generateEmbeddings(text))
                    );
                    return batchResults;
                },
                this.isBatchSizeError
            );
        }
        catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            log.error(`Batch embedding error for provider ${this.name}: ${errorMessage}`);
            throw new Error(`${this.name} batch embedding error: ${errorMessage}`);
        }
    }

    /**
     * Generate embeddings for a note with its context
     */
    async generateNoteEmbeddings(context: NoteEmbeddingContext): Promise<Float32Array> {
        const text = [context.title || "", context.content || ""].filter(Boolean).join(" ");
        return this.generateEmbeddings(text);
    }

    /**
     * Generate embeddings for multiple notes with their contexts
     */
    async generateBatchNoteEmbeddings(contexts: NoteEmbeddingContext[]): Promise<Float32Array[]> {
        if (contexts.length === 0) {
            return [];
        }

        try {
            return await this.processWithAdaptiveBatch(
                contexts,
                async (batch) => {
                    const batchResults = await Promise.all(
                        batch.map(context => this.generateNoteEmbeddings(context))
                    );
                    return batchResults;
                },
                this.isBatchSizeError
            );
        }
        catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            log.error(`Batch note embedding error for provider ${this.name}: ${errorMessage}`);
            throw new Error(`${this.name} batch note embedding error: ${errorMessage}`);
        }
    }

    /**
     * Cleans and normalizes text for embeddings by removing excessive whitespace
     */
    private cleanText(text: string): string {
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Generates a rich text representation of a note's context for embedding
     */
    protected generateNoteContextText(context: NoteEmbeddingContext): string {
        // Build a relationship-focused summary first
        const relationshipSummary = [];

        // Summarize the note's place in the hierarchy
        if (context.parentTitles.length > 0) {
            relationshipSummary.push(`This note is a child of: ${context.parentTitles.map(t => this.cleanText(t)).join(', ')}.`);
        }

        if (context.childTitles.length > 0) {
            relationshipSummary.push(`This note has children: ${context.childTitles.map(t => this.cleanText(t)).join(', ')}.`);
        }

        // Emphasize relationships with other notes
        if (context.relatedNotes && context.relatedNotes.length > 0) {
            // Group by relation type for better understanding
            const relationsByType: Record<string, string[]> = {};
            for (const rel of context.relatedNotes) {
                if (!relationsByType[rel.relationName]) {
                    relationsByType[rel.relationName] = [];
                }
                relationsByType[rel.relationName].push(this.cleanText(rel.targetTitle));
            }

            for (const [relType, targets] of Object.entries(relationsByType)) {
                relationshipSummary.push(`This note has ${relType} relationship with: ${targets.join(', ')}.`);
            }
        }

        // Emphasize backlinks for bidirectional relationships
        if (context.backlinks && context.backlinks.length > 0) {
            // Group by relation type
            const backlinksByType: Record<string, string[]> = {};
            for (const link of context.backlinks) {
                if (!backlinksByType[link.relationName]) {
                    backlinksByType[link.relationName] = [];
                }
                backlinksByType[link.relationName].push(this.cleanText(link.sourceTitle));
            }

            for (const [relType, sources] of Object.entries(backlinksByType)) {
                relationshipSummary.push(`This note is ${relType} of: ${sources.join(', ')}.`);
            }
        }

        // Emphasize templates/inheritance
        if (context.templateTitles && context.templateTitles.length > 0) {
            relationshipSummary.push(`This note inherits from: ${context.templateTitles.map(t => this.cleanText(t)).join(', ')}.`);
        }

        // Start with core note information
        let result =
            `Title: ${this.cleanText(context.title)}\n` +
            `Type: ${context.type}\n` +
            `MIME: ${context.mime}\n`;

        // Add the relationship summary at the beginning for emphasis
        if (relationshipSummary.length > 0) {
            result += `Relationships: ${relationshipSummary.join(' ')}\n`;
        }

        // Continue with dates
        result +=
            `Created: ${context.dateCreated}\n` +
            `Modified: ${context.dateModified}\n`;

        // Add attributes in a concise format
        if (context.attributes.length > 0) {
            result += 'Attributes: ';
            const attributeTexts = context.attributes.map(attr =>
                `${attr.type}:${attr.name}=${this.cleanText(attr.value)}`
            );
            result += attributeTexts.join('; ') + '\n';
        }

        // Add important label values concisely
        if (context.labelValues && Object.keys(context.labelValues).length > 0) {
            result += 'Labels: ';
            const labelTexts = Object.entries(context.labelValues).map(([name, value]) =>
                `${name}=${this.cleanText(value)}`
            );
            result += labelTexts.join('; ') + '\n';
        }

        // Parents, children, templates, relations, and backlinks are now handled in the relationship summary
        // But we'll include them again in a more structured format for organization

        if (context.parentTitles.length > 0) {
            result += `Parents: ${context.parentTitles.map(t => this.cleanText(t)).join('; ')}\n`;
        }

        if (context.childTitles.length > 0) {
            result += `Children: ${context.childTitles.map(t => this.cleanText(t)).join('; ')}\n`;
        }

        if (context.templateTitles && context.templateTitles.length > 0) {
            result += `Templates: ${context.templateTitles.map(t => this.cleanText(t)).join('; ')}\n`;
        }

        if (context.relatedNotes && context.relatedNotes.length > 0) {
            result += 'Related: ';
            const relatedTexts = context.relatedNotes.map(rel =>
                `${rel.relationName}→${this.cleanText(rel.targetTitle)}`
            );
            result += relatedTexts.join('; ') + '\n';
        }

        if (context.backlinks && context.backlinks.length > 0) {
            result += 'Referenced By: ';
            const backlinkTexts = context.backlinks.map(link =>
                `${this.cleanText(link.sourceTitle)}→${link.relationName}`
            );
            result += backlinkTexts.join('; ') + '\n';
        }

        // Add attachments concisely
        if (context.attachments.length > 0) {
            result += 'Attachments: ';
            const attachmentTexts = context.attachments.map(att =>
                `${this.cleanText(att.title)}(${att.mime})`
            );
            result += attachmentTexts.join('; ') + '\n';
        }

        // Add content (already cleaned in getNoteEmbeddingContext)
        result += `Content: ${context.content}`;

        return result;
    }
}
