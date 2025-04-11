/**
 * Search Notes Tool
 *
 * This tool allows the LLM to search for notes using semantic search.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';
import aiServiceManager from '../ai_service_manager.js';

/**
 * Definition of the search notes tool
 */
export const searchNotesToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'search_notes',
        description: 'Search for notes in the database using semantic search. Returns notes most semantically related to the query.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query to find semantically related notes'
                },
                parentNoteId: {
                    type: 'string',
                    description: 'Optional parent note ID to restrict search to a specific branch'
                },
                maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 5)'
                }
            },
            required: ['query']
        }
    }
};

/**
 * Search notes tool implementation
 */
export class SearchNotesTool implements ToolHandler {
    public definition: Tool = searchNotesToolDefinition;

    /**
     * Execute the search notes tool
     */
    public async execute(args: { query: string, parentNoteId?: string, maxResults?: number }): Promise<string | object> {
        try {
            const { query, parentNoteId, maxResults = 5 } = args;

            log.info(`Executing search_notes tool - Query: "${query}", ParentNoteId: ${parentNoteId || 'not specified'}, MaxResults: ${maxResults}`);

            // Get the vector search tool from the AI service manager
            const vectorSearchTool = aiServiceManager.getVectorSearchTool();
            log.info(`Retrieved vector search tool from AI service manager`);

            // Execute the search
            log.info(`Performing semantic search for: "${query}"`);
            const searchStartTime = Date.now();
            const results = await vectorSearchTool.searchNotes(query, {
                parentNoteId,
                maxResults
            });
            const searchDuration = Date.now() - searchStartTime;

            log.info(`Search completed in ${searchDuration}ms, found ${results.length} matching notes`);

            if (results.length > 0) {
                // Log top results
                results.slice(0, 3).forEach((result, index) => {
                    log.info(`Result ${index + 1}: "${result.title}" (similarity: ${Math.round(result.similarity * 100)}%)`);
                });
            } else {
                log.info(`No matching notes found for query: "${query}"`);
            }

            // Format the results
            return {
                count: results.length,
                results: results.map(result => ({
                    noteId: result.noteId,
                    title: result.title,
                    preview: result.contentPreview,
                    similarity: Math.round(result.similarity * 100) / 100,
                    parentId: result.parentId
                }))
            };
        } catch (error: any) {
            log.error(`Error executing search_notes tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }
}
