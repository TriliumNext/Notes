import type BNote from "../../becca/entities/bnote.js";
import type BAttribute from "../../becca/entities/battribute.js";
import type { AttributeType } from "../../becca/entities/rows.js";

/**
 * Processes a note's content and metadata into a format optimized for embeddings
 */
export class NoteContentProcessor {
    /**
     * Generate a rich text representation of a note for embedding generation
     */
    async generateEmbeddingText(note: BNote, options: {
        includeContent?: boolean;
        includeMetadata?: boolean;
        includeRelations?: boolean;
        includeLabels?: boolean;
        includeHierarchy?: boolean;
        maxContentLength?: number;
    } = {}): Promise<string> {
        const {
            includeContent = true,
            includeMetadata = true,
            includeRelations = true,
            includeLabels = true,
            includeHierarchy = true,
            maxContentLength = 10000
        } = options;

        const parts: string[] = [];

        // Title is always included
        parts.push(`Title: ${note.title}`);

        if (includeMetadata) {
            parts.push(`Type: ${note.type}`);
            if (note.mime) {
                parts.push(`MIME Type: ${note.mime}`);
            }
            parts.push(`Created: ${note.dateCreated}`);
            parts.push(`Last Modified: ${note.dateModified}`);
        }

        if (includeContent) {
            let content = await this.getProcessedContent(note);
            if (content) {
                if (content.length > maxContentLength) {
                    content = content.substring(0, maxContentLength) + "...";
                }
                parts.push(`Content:\n${content}`);
            }
        }

        if (includeLabels) {
            const labels = note.getOwnedAttributes()
                .filter(attr => attr.type === "label" && !attr.name.startsWith("relation:") && !attr.name.startsWith("label:"));
            
            if (labels.length > 0) {
                parts.push("Labels:");
                for (const label of labels) {
                    if (label.value) {
                        parts.push(`#${label.name}=${label.value}`);
                    } else {
                        parts.push(`#${label.name}`);
                    }
                }
            }
        }

        if (includeRelations) {
            const relations = note.getOwnedAttributes()
                .filter(attr => attr.type === "relation");
            
            if (relations.length > 0) {
                parts.push("Relations:");
                for (const relation of relations) {
                    const targetNote = relation.getTargetNote();
                    if (targetNote) {
                        parts.push(`~${relation.name}=${targetNote.title}`);
                    }
                }
            }
        }

        if (includeHierarchy) {
            const parents = note.getParentNotes();
            if (parents.length > 0) {
                parts.push("Parent Notes:");
                for (const parent of parents) {
                    parts.push(`- ${parent.title}`);
                }
            }

            const children = note.getChildNotes();
            if (children.length > 0) {
                parts.push("Child Notes:");
                for (const child of children) {
                    parts.push(`- ${child.title}`);
                }
            }
        }

        return parts.join("\n");
    }

    /**
     * Process note content based on its type and mime
     */
    private async getProcessedContent(note: BNote): Promise<string> {
        // Get the raw content
        const content = note.getContent();
        if (!content) {
            return "";
        }

        // Process based on note type
        switch (note.type) {
            case "text":
            case "code":
                return this.cleanTextContent(content.toString());
            
            case "relationMap":
            case "mindMap":
            case "canvas":
                // For structured data types, try to extract meaningful text
                try {
                    const data = JSON.parse(content.toString());
                    return this.extractTextFromStructured(data);
                } catch {
                    return content.toString();
                }
            
            case "mermaid":
                // For mermaid diagrams, include the raw diagram text
                return content.toString();
            
            case "book":
            case "doc":
                // These types might have special formatting or structure
                return this.cleanTextContent(content.toString());
            
            default:
                // For other types, return raw content if it's text-based
                if (note.mime.startsWith("text/") || 
                    note.mime.includes("json") || 
                    note.mime.includes("javascript")) {
                    return content.toString();
                }
                return `Binary content of type ${note.mime}`;
        }
    }

    /**
     * Clean up text content by removing excessive whitespace and HTML tags
     */
    private cleanTextContent(content: string): string {
        // Remove HTML tags
        content = content.replace(/<[^>]*>/g, " ");
        
        // Normalize whitespace
        content = content.replace(/\s+/g, " ").trim();
        
        return content;
    }

    /**
     * Extract meaningful text from structured data
     */
    private extractTextFromStructured(data: any): string {
        const texts: string[] = [];
        
        function extract(obj: any) {
            if (!obj) return;
            
            if (typeof obj === "string") {
                texts.push(obj);
            } else if (Array.isArray(obj)) {
                obj.forEach(item => extract(item));
            } else if (typeof obj === "object") {
                // Look for common text-containing fields
                const textFields = ["text", "title", "description", "name", "content"];
                for (const field of textFields) {
                    if (obj[field]) {
                        texts.push(obj[field]);
                    }
                }
                
                // Recursively process all values
                Object.values(obj).forEach(value => extract(value));
            }
        }
        
        extract(data);
        return texts.join(" ");
    }
} 