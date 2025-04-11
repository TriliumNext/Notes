/**
 * Relationship Tool
 *
 * This tool allows the LLM to create, identify, or modify relationships between notes.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';
import becca from '../../../becca/becca.js';
import attributes from '../../attributes.js';
import aiServiceManager from '../ai_service_manager.js';

/**
 * Definition of the relationship tool
 */
export const relationshipToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'manage_relationships',
        description: 'Create, list, or modify relationships between notes',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Action to perform on relationships',
                    enum: ['create', 'list', 'find_related', 'suggest']
                },
                sourceNoteId: {
                    type: 'string',
                    description: 'ID of the source note for the relationship'
                },
                targetNoteId: {
                    type: 'string',
                    description: 'ID of the target note for the relationship (for create action)'
                },
                relationName: {
                    type: 'string',
                    description: 'Name of the relation (for create action, e.g., "references", "belongs to", "depends on")'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of relationships to return (for list action)'
                }
            },
            required: ['action', 'sourceNoteId']
        }
    }
};

/**
 * Relationship tool implementation
 */
export class RelationshipTool implements ToolHandler {
    public definition: Tool = relationshipToolDefinition;

    /**
     * Execute the relationship tool
     */
    public async execute(args: {
        action: 'create' | 'list' | 'find_related' | 'suggest',
        sourceNoteId: string,
        targetNoteId?: string,
        relationName?: string,
        limit?: number
    }): Promise<string | object> {
        try {
            const { action, sourceNoteId, targetNoteId, relationName, limit = 10 } = args;

            log.info(`Executing manage_relationships tool - Action: ${action}, SourceNoteId: ${sourceNoteId}`);

            // Get the source note from becca
            const sourceNote = becca.notes[sourceNoteId];

            if (!sourceNote) {
                log.info(`Source note with ID ${sourceNoteId} not found - returning error`);
                return `Error: Source note with ID ${sourceNoteId} not found`;
            }

            log.info(`Found source note: "${sourceNote.title}" (Type: ${sourceNote.type})`);

            // Handle different actions
            if (action === 'create') {
                return await this.createRelationship(sourceNote, targetNoteId, relationName);
            } else if (action === 'list') {
                return await this.listRelationships(sourceNote, limit);
            } else if (action === 'find_related') {
                return await this.findRelatedNotes(sourceNote, limit);
            } else if (action === 'suggest') {
                return await this.suggestRelationships(sourceNote, limit);
            } else {
                return `Error: Unsupported action "${action}". Supported actions are: create, list, find_related, suggest`;
            }
        } catch (error: any) {
            log.error(`Error executing manage_relationships tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }

    /**
     * Create a relationship between notes
     */
    private async createRelationship(sourceNote: any, targetNoteId?: string, relationName?: string): Promise<object> {
        if (!targetNoteId) {
            return {
                success: false,
                message: 'Target note ID is required for create action'
            };
        }

        if (!relationName) {
            return {
                success: false,
                message: 'Relation name is required for create action'
            };
        }

        // Get the target note from becca
        const targetNote = becca.notes[targetNoteId];

        if (!targetNote) {
            log.info(`Target note with ID ${targetNoteId} not found - returning error`);
            return {
                success: false,
                message: `Target note with ID ${targetNoteId} not found`
            };
        }

        log.info(`Found target note: "${targetNote.title}" (Type: ${targetNote.type})`);

        try {
            // Check if relationship already exists
            const existingRelations = sourceNote.getRelationTargets(relationName);

            for (const existingNote of existingRelations) {
                if (existingNote.noteId === targetNoteId) {
                    log.info(`Relationship ${relationName} already exists from "${sourceNote.title}" to "${targetNote.title}"`);
                    return {
                        success: false,
                        sourceNoteId: sourceNote.noteId,
                        sourceTitle: sourceNote.title,
                        targetNoteId: targetNote.noteId,
                        targetTitle: targetNote.title,
                        relationName: relationName,
                        message: `Relationship ${relationName} already exists from "${sourceNote.title}" to "${targetNote.title}"`
                    };
                }
            }

            // Create the relationship attribute
            const startTime = Date.now();
            await attributes.createRelation(sourceNote.noteId, relationName, targetNote.noteId);
            const duration = Date.now() - startTime;

            log.info(`Created relationship ${relationName} from "${sourceNote.title}" to "${targetNote.title}" in ${duration}ms`);

            return {
                success: true,
                sourceNoteId: sourceNote.noteId,
                sourceTitle: sourceNote.title,
                targetNoteId: targetNote.noteId,
                targetTitle: targetNote.title,
                relationName: relationName,
                message: `Created relationship ${relationName} from "${sourceNote.title}" to "${targetNote.title}"`
            };
        } catch (error: any) {
            log.error(`Error creating relationship: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * List relationships for a note
     */
    private async listRelationships(sourceNote: any, limit: number): Promise<object> {
        try {
            // Get outgoing relationships (where this note is the source)
            const outgoingAttributes = sourceNote.getAttributes()
                .filter((attr: any) => attr.type === 'relation')
                .slice(0, limit);

            const outgoingRelations = [];

            for (const attr of outgoingAttributes) {
                const targetNote = becca.notes[attr.value];

                if (targetNote) {
                    outgoingRelations.push({
                        relationName: attr.name,
                        targetNoteId: targetNote.noteId,
                        targetTitle: targetNote.title
                    });
                }
            }

            // Get incoming relationships (where this note is the target)
            // Since becca.findNotesWithRelation doesn't exist, use attributes to find notes with relation
            const incomingRelations = [];

            // Find all attributes of type relation that point to this note
            const relationAttributes = sourceNote.getTargetRelations();

            for (const attr of relationAttributes) {
                if (attr.type === 'relation') {
                    const sourceOfRelation = attr.getNote();

                    if (sourceOfRelation && !sourceOfRelation.isDeleted) {
                        incomingRelations.push({
                            relationName: attr.name,
                            sourceNoteId: sourceOfRelation.noteId,
                            sourceTitle: sourceOfRelation.title
                        });

                        if (incomingRelations.length >= limit) {
                            break;
                        }
                    }
                }
            }

            log.info(`Found ${outgoingRelations.length} outgoing and ${incomingRelations.length} incoming relationships`);

            return {
                success: true,
                noteId: sourceNote.noteId,
                title: sourceNote.title,
                outgoingRelations: outgoingRelations,
                incomingRelations: incomingRelations.slice(0, limit),
                message: `Found ${outgoingRelations.length} outgoing and ${incomingRelations.length} incoming relationships for "${sourceNote.title}"`
            };
        } catch (error: any) {
            log.error(`Error listing relationships: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Find related notes using vector similarity
     */
    private async findRelatedNotes(sourceNote: any, limit: number): Promise<object> {
        try {
            // Get the vector search tool from the AI service manager
            const vectorSearchTool = aiServiceManager.getVectorSearchTool();

            if (!vectorSearchTool) {
                log.error('Vector search tool not available');
                return {
                    success: false,
                    message: 'Vector search capability not available'
                };
            }

            log.info(`Using vector search to find notes related to "${sourceNote.title}"`);

            // Get note content for semantic search
            const content = await sourceNote.getContent();
            const title = sourceNote.title;

            // Use both title and content for search
            const searchQuery = title + (content && typeof content === 'string' ? ': ' + content.substring(0, 500) : '');

            // Execute the search
            const searchStartTime = Date.now();
            const results = await vectorSearchTool.searchNotes(searchQuery, {
                maxResults: limit + 1 // Add 1 to account for the source note itself
            });
            const searchDuration = Date.now() - searchStartTime;

            // Filter out the source note from results
            const filteredResults = results.filter(note => note.noteId !== sourceNote.noteId);
            log.info(`Found ${filteredResults.length} related notes in ${searchDuration}ms`);

            return {
                success: true,
                noteId: sourceNote.noteId,
                title: sourceNote.title,
                relatedNotes: filteredResults.slice(0, limit).map(note => ({
                    noteId: note.noteId,
                    title: note.title,
                    similarity: Math.round(note.similarity * 100) / 100
                })),
                message: `Found ${filteredResults.length} notes semantically related to "${sourceNote.title}"`
            };
        } catch (error: any) {
            log.error(`Error finding related notes: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Suggest possible relationships based on content analysis
     */
    private async suggestRelationships(sourceNote: any, limit: number): Promise<object> {
        try {
            // First, find related notes using vector search
            const relatedResult = await this.findRelatedNotes(sourceNote, limit) as any;

            if (!relatedResult.success || !relatedResult.relatedNotes || relatedResult.relatedNotes.length === 0) {
                return {
                    success: false,
                    message: 'Could not find any related notes to suggest relationships'
                };
            }

            // Get the AI service for relationship suggestion
            const aiService = aiServiceManager.getService();

            if (!aiService) {
                log.error('No AI service available for relationship suggestions');
                return {
                    success: false,
                    message: 'AI service not available for relationship suggestions',
                    relatedNotes: relatedResult.relatedNotes
                };
            }

            log.info(`Using ${aiService.getName()} to suggest relationships for ${relatedResult.relatedNotes.length} related notes`);

            // Get the source note content
            const sourceContent = await sourceNote.getContent();

            // Prepare suggestions
            const suggestions = [];

            for (const relatedNote of relatedResult.relatedNotes) {
                try {
                    // Get the target note content
                    const targetNote = becca.notes[relatedNote.noteId];
                    const targetContent = await targetNote.getContent();

                    // Prepare a prompt for the AI service
                    const prompt = `Analyze the relationship between these two notes and suggest a descriptive relation name (like "references", "implements", "depends on", etc.)

SOURCE NOTE: "${sourceNote.title}"
${typeof sourceContent === 'string' ? sourceContent.substring(0, 300) : ''}

TARGET NOTE: "${targetNote.title}"
${typeof targetContent === 'string' ? targetContent.substring(0, 300) : ''}

Suggest the most appropriate relationship type that would connect the source note to the target note. Reply with ONLY the relationship name, nothing else.`;

                    // Get the suggestion
                    const completion = await aiService.generateChatCompletion([
                        {
                            role: 'system',
                            content: 'You analyze the relationship between notes and suggest a concise, descriptive relation name.'
                        },
                        { role: 'user', content: prompt }
                    ], {
                        temperature: 0.4,
                        maxTokens: 50
                    });

                    // Extract just the relation name (remove any formatting or explanation)
                    const relationName = completion.text
                        .replace(/^["']|["']$/g, '') // Remove quotes
                        .replace(/^relationship:|\./gi, '') // Remove prefixes/suffixes
                        .trim();

                    suggestions.push({
                        targetNoteId: relatedNote.noteId,
                        targetTitle: relatedNote.title,
                        similarity: relatedNote.similarity,
                        suggestedRelation: relationName
                    });

                    log.info(`Suggested relationship "${relationName}" from "${sourceNote.title}" to "${targetNote.title}"`);
                } catch (error: any) {
                    log.error(`Error generating suggestion: ${error.message || String(error)}`);
                    // Continue with other suggestions
                }
            }

            return {
                success: true,
                noteId: sourceNote.noteId,
                title: sourceNote.title,
                suggestions: suggestions,
                message: `Generated ${suggestions.length} relationship suggestions for "${sourceNote.title}"`
            };
        } catch (error: any) {
            log.error(`Error suggesting relationships: ${error.message || String(error)}`);
            throw error;
        }
    }
}
