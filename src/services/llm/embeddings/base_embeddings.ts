import type { EmbeddingProvider, EmbeddingConfig, NoteEmbeddingContext } from './embeddings_interface.js';

/**
 * Base class that implements common functionality for embedding providers
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
    abstract name: string;
    protected config: EmbeddingConfig;

    constructor(config: EmbeddingConfig) {
        this.config = config;
    }

    getConfig(): EmbeddingConfig {
        return this.config;
    }

    abstract generateEmbeddings(text: string): Promise<Float32Array>;
    abstract generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]>;

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

    /**
     * Default implementation that converts note context to text and generates embeddings
     */
    async generateNoteEmbeddings(context: NoteEmbeddingContext): Promise<Float32Array> {
        const text = this.generateNoteContextText(context);
        return this.generateEmbeddings(text);
    }

    /**
     * Default implementation that processes notes in batch
     */
    async generateBatchNoteEmbeddings(contexts: NoteEmbeddingContext[]): Promise<Float32Array[]> {
        const texts = contexts.map(ctx => this.generateNoteContextText(ctx));
        return this.generateBatchEmbeddings(texts);
    }
}
