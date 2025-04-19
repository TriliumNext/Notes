/**
 * Search Suggestion Tool
 *
 * This tool provides guidance on how to formulate different types of search queries in Trilium.
 * It helps the LLM understand the correct syntax for various search scenarios.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';

// Template types
type QueryTemplate = {
    template: string;
    description: string;
};

type SearchTypesMap = {
    basic: QueryTemplate[];
    attribute: QueryTemplate[];
    content: QueryTemplate[];
    relation: QueryTemplate[];
    date: QueryTemplate[];
    advanced: QueryTemplate[];
};

type SearchType = keyof SearchTypesMap;

/**
 * Definition of the search suggestion tool
 */
export const searchSuggestionToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'search_suggestion',
        description: 'Get suggestions on how to formulate different types of search queries in Trilium. Use this when you need help constructing the right search syntax.',
        parameters: {
            type: 'object',
            properties: {
                searchType: {
                    type: 'string',
                    description: 'Type of search you want suggestions for',
                    enum: [
                        'basic',
                        'attribute',
                        'content',
                        'relation',
                        'date',
                        'advanced'
                    ]
                },
                userQuery: {
                    type: 'string',
                    description: 'The user\'s original query or description of what they want to search for'
                }
            },
            required: ['searchType']
        }
    }
};

/**
 * Search suggestion tool implementation
 */
export class SearchSuggestionTool implements ToolHandler {
    public definition: Tool = searchSuggestionToolDefinition;

    // Example query templates for each search type
    private queryTemplates: SearchTypesMap = {
        basic: [
            { template: '"{term1}"', description: 'Exact phrase search' },
            { template: '{term1} {term2}', description: 'Find notes containing both terms' },
            { template: '{term1} OR {term2}', description: 'Find notes containing either term' }
        ],
        attribute: [
            { template: '#{attributeName}', description: 'Find notes with a specific label' },
            { template: '#{attributeName} = {value}', description: 'Find notes with label equal to value' },
            { template: '#{attributeName} >= {value}', description: 'Find notes with numeric label greater or equal to value' },
            { template: '#{attributeName} *= {value}', description: 'Find notes with label containing value' },
            { template: '~{relationName}.title *= {value}', description: 'Find notes with relation to note whose title contains value' }
        ],
        content: [
            { template: 'note.content *= "{text}"', description: 'Find notes containing specific text in content' },
            { template: 'note.content =* "{text}"', description: 'Find notes whose content starts with text' },
            { template: 'note.content %= "{regex}"', description: 'Find notes whose content matches regex pattern' }
        ],
        relation: [
            { template: '~{relationName}', description: 'Find notes with a specific relation' },
            { template: '~{relationName}.title *= {text}', description: 'Find notes related to notes with title containing text' },
            { template: '~{relationName}.#tag', description: 'Find notes related to notes with specific label' }
        ],
        date: [
            { template: '#dateNote = MONTH', description: 'Find notes with dateNote attribute equal to current month' },
            { template: '#dateNote >= TODAY-7', description: 'Find notes with dateNote in the last week' },
            { template: '#dateCreated >= YEAR-1', description: 'Find notes created within the last year' }
        ],
        advanced: [
            { template: '#book AND #year >= 2020 AND note.content *= "important"', description: 'Combined attribute and content search' },
            { template: '#project AND (#status=active OR #status=pending)', description: 'Complex attribute condition' },
            { template: 'note.children.title *= {text}', description: 'Find notes whose children contain text in title' }
        ]
    };

    /**
     * Execute the search suggestion tool
     */
    public async execute(args: { searchType: string, userQuery?: string }): Promise<string | object> {
        try {
            const { searchType, userQuery = '' } = args;

            log.info(`Executing search_suggestion tool - Type: "${searchType}", UserQuery: "${userQuery}"`);

            // Validate search type
            if (!this.isValidSearchType(searchType)) {
                return {
                    error: `Invalid search type: ${searchType}`,
                    validTypes: Object.keys(this.queryTemplates)
                };
            }

            // Generate suggestions based on search type and user query
            const templates = this.queryTemplates[searchType as SearchType];

            // Extract potential terms from the user query
            const terms = userQuery
                .split(/\s+/)
                .filter(term => term.length > 2)
                .map(term => term.replace(/[^\w\s]/g, ''));

            // Fill templates with user terms if available
            const suggestions = templates.map((template: QueryTemplate) => {
                let filledTemplate = template.template;

                // Try to fill in term1, term2, etc.
                if (terms.length > 0) {
                    for (let i = 0; i < Math.min(terms.length, 3); i++) {
                        filledTemplate = filledTemplate.replace(`{term${i+1}}`, terms[i]);
                    }
                }

                // For attribute/relation examples, try to use something meaningful
                if (searchType === 'attribute' || searchType === 'relation') {
                    // These are common attribute/relation names in note-taking contexts
                    const commonAttributes = ['tag', 'category', 'status', 'priority', 'project', 'area', 'year'];
                    filledTemplate = filledTemplate.replace('{attributeName}', commonAttributes[Math.floor(Math.random() * commonAttributes.length)]);
                    filledTemplate = filledTemplate.replace('{relationName}', 'parent');
                }

                // Fill remaining placeholders with generic examples
                filledTemplate = filledTemplate
                    .replace('{text}', terms[0] || 'example')
                    .replace('{value}', terms[1] || 'value')
                    .replace('{regex}', '[a-z]+');

                return {
                    query: filledTemplate,
                    description: template.description
                };
            });

            return {
                searchType,
                userQuery,
                suggestions,
                note: "Use these suggestions with keyword_search_notes or attribute_search tools to find relevant notes."
            };

        } catch (error: any) {
            log.error(`Error executing search_suggestion tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }

    /**
     * Check if a search type is valid
     */
    private isValidSearchType(searchType: string): searchType is SearchType {
        return Object.keys(this.queryTemplates).includes(searchType);
    }
}
