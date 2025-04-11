/**
 * Keyword Search Notes Tool
 *
 * This tool allows the LLM to search for notes using exact keyword matching and attribute-based filters.
 * It complements the semantic search tool by providing more precise, rule-based search capabilities.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';
import searchService from '../../search/services/search.js';
import becca from '../../../becca/becca.js';

/**
 * Definition of the keyword search notes tool
 */
export const keywordSearchToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'keyword_search_notes',
        description: 'Search for notes using exact keyword matching and attribute filters. Use this for precise searches when you need exact matches or want to filter by attributes.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query using Trilium\'s search syntax. Examples: "rings tolkien" (find notes with both words), "#book #year >= 2000" (notes with label "book" and "year" attribute >= 2000), "note.content *=* important" (notes with "important" in content)'
                },
                maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 10)'
                },
                includeArchived: {
                    type: 'boolean',
                    description: 'Whether to include archived notes in search results (default: false)'
                }
            },
            required: ['query']
        }
    }
};

/**
 * Keyword search notes tool implementation
 */
export class KeywordSearchTool implements ToolHandler {
    public definition: Tool = keywordSearchToolDefinition;

    /**
     * Execute the keyword search notes tool
     */
    public async execute(args: { query: string, maxResults?: number, includeArchived?: boolean }): Promise<string | object> {
        try {
            const { query, maxResults = 10, includeArchived = false } = args;

            log.info(`Executing keyword_search_notes tool - Query: "${query}", MaxResults: ${maxResults}, IncludeArchived: ${includeArchived}`);

            // Execute the search
            log.info(`Performing keyword search for: "${query}"`);
            const searchStartTime = Date.now();

            // Find results with the given query
            const searchContext = {
                includeArchivedNotes: includeArchived,
                fuzzyAttributeSearch: false
            };

            const searchResults = searchService.searchNotes(query, searchContext);
            const limitedResults = searchResults.slice(0, maxResults);

            const searchDuration = Date.now() - searchStartTime;

            log.info(`Keyword search completed in ${searchDuration}ms, found ${searchResults.length} matching notes, returning ${limitedResults.length}`);

            if (limitedResults.length > 0) {
                // Log top results
                limitedResults.slice(0, 3).forEach((result, index) => {
                    log.info(`Result ${index + 1}: "${result.title}"`);
                });
            } else {
                log.info(`No matching notes found for query: "${query}"`);
            }

            // Format the results
            return {
                count: limitedResults.length,
                totalFound: searchResults.length,
                results: limitedResults.map(note => {
                    // Get a preview of the note content
                    let contentPreview = '';
                    try {
                        const content = note.getContent();
                        if (typeof content === 'string') {
                            contentPreview = content.length > 150 ? content.substring(0, 150) + '...' : content;
                        } else if (Buffer.isBuffer(content)) {
                            contentPreview = '[Binary content]';
                        } else {
                            contentPreview = String(content).substring(0, 150) + (String(content).length > 150 ? '...' : '');
                        }
                    } catch (e) {
                        contentPreview = '[Content not available]';
                    }

                    // Get note attributes
                    const attributes = note.getOwnedAttributes().map(attr => ({
                        type: attr.type,
                        name: attr.name,
                        value: attr.value
                    }));

                    return {
                        noteId: note.noteId,
                        title: note.title,
                        preview: contentPreview,
                        attributes: attributes.length > 0 ? attributes : undefined,
                        type: note.type,
                        mime: note.mime,
                        isArchived: note.isArchived
                    };
                })
            };
        } catch (error: any) {
            log.error(`Error executing keyword_search_notes tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }
}
