import log from '../../log.js';

/**
 * Options for JSON extraction
 */
export interface JsonExtractionOptions {
    /** Attempt to find and extract arrays as the primary target (for query enhancers, etc.) */
    extractArrays?: boolean;
    /** Minimum length for extracted strings to be considered valid */
    minStringLength?: number;
    /** Apply fixes to malformed JSON before parsing */
    applyFixes?: boolean;
    /** Whether to use fallback extraction methods when JSON parsing fails */
    useFallbacks?: boolean;
}

/**
 * Structure of a tool call extracted from an LLM response
 */
export interface ExtractedToolCall {
    /** The name of the tool to call */
    tool_name: string;
    /** Parameters for the tool call */
    parameters: Record<string, any>;
    /** The original JSON string that was parsed */
    originalJson?: string;
}

/**
 * Utility class for extracting and parsing JSON from LLM responses
 * Handles malformed JSON, escaping issues, and provides fallback mechanisms
 */
export class JsonExtractor {
    /**
     * Extract JSON from an LLM response
     *
     * @param text - The raw text from an LLM response
     * @param options - Options to control extraction behavior
     * @returns The parsed JSON object or array, or null if extraction failed
     */
    static extract<T = any>(text: string, options: JsonExtractionOptions = {}): T | null {
        const opts = {
            extractArrays: false,
            minStringLength: 3,
            applyFixes: true,
            useFallbacks: true,
            ...options
        };

        try {
            // Clean up the input text
            let cleanedText = this.cleanMarkdownAndFormatting(text);

            // Try to extract specific JSON structures if needed
            if (opts.extractArrays) {
                const arrayResult = this.extractArray(cleanedText, opts);
                if (arrayResult) {
                    return arrayResult as unknown as T;
                }
            }

            // Try direct JSON parsing with fixes if enabled
            if (opts.applyFixes) {
                const fixedResult = this.extractWithFixes(cleanedText);
                if (fixedResult !== null) {
                    return fixedResult as T;
                }
            }

            // Try direct JSON parsing without fixes
            try {
                return JSON.parse(cleanedText) as T;
            } catch (e) {
                // Fall through to fallbacks
            }

            // Use fallbacks if enabled
            if (opts.useFallbacks) {
                if (opts.extractArrays) {
                    const items = this.extractItemsAsFallback(text, opts.minStringLength);
                    if (items.length > 0) {
                        return items as unknown as T;
                    }
                }

                // If it looks like a JSON object but can't be parsed, try regex extraction
                if (cleanedText.includes('{') && cleanedText.includes('}')) {
                    const objectResult = this.extractObject(cleanedText);
                    if (objectResult) {
                        return objectResult as T;
                    }
                }
            }

            return null;
        } catch (error) {
            log.error(`JSON extraction error: ${error}`);
            return null;
        }
    }

    /**
     * Extract tool calls from an LLM response
     * Specifically designed to handle Ollama tool call format
     *
     * @param text - Raw text from the LLM response
     * @returns Array of tool calls or empty array if none found
     */
    static extractToolCalls(text: string): ExtractedToolCall[] {
        const toolCalls: ExtractedToolCall[] = [];

        try {
            // Clean up the text and find all JSON objects
            const cleanedText = this.cleanMarkdownAndFormatting(text);

            // Try to find complete JSON objects
            const jsonObjectMatches = this.findJsonObjects(cleanedText);

            for (const jsonString of jsonObjectMatches) {
                try {
                    // Try to fix and parse each potential JSON object
                    const fixedJson = this.applyJsonFixes(jsonString);
                    const parsedJson = JSON.parse(fixedJson);

                    // Check if this looks like a tool call
                    if (
                        parsedJson &&
                        typeof parsedJson === 'object' &&
                        parsedJson.tool_name &&
                        typeof parsedJson.tool_name === 'string' &&
                        parsedJson.parameters &&
                        typeof parsedJson.parameters === 'object'
                    ) {
                        toolCalls.push({
                            tool_name: parsedJson.tool_name,
                            parameters: parsedJson.parameters,
                            originalJson: jsonString
                        });
                    }
                } catch (e) {
                    // If this JSON object failed to parse, try more aggressive fixes
                    log.info(`Failed to parse potential tool call JSON: ${e}`);
                }
            }

            // If we couldn't find valid tool calls with the first approach, try regex pattern matching
            if (toolCalls.length === 0) {
                // Look for tool_name/parameters patterns in the text
                const toolNameMatch = text.match(/["']?tool_name["']?\s*:\s*["']([^"']+)["']/);
                const parametersMatch = text.match(/["']?parameters["']?\s*:\s*({[^}]+})/);

                if (toolNameMatch && parametersMatch) {
                    try {
                        const toolName = toolNameMatch[1];
                        const parametersStr = this.applyJsonFixes(parametersMatch[1]);
                        const parameters = JSON.parse(parametersStr);

                        toolCalls.push({
                            tool_name: toolName,
                            parameters,
                            originalJson: `{"tool_name":"${toolName}","parameters":${parametersStr}}`
                        });
                    } catch (e) {
                        log.info(`Failed to parse tool call with regex approach: ${e}`);
                    }
                }
            }
        } catch (error) {
            log.error(`Error extracting tool calls: ${error}`);
        }

        return toolCalls;
    }

    /**
     * Find all potential JSON objects in a text
     */
    private static findJsonObjects(text: string): string[] {
        const jsonObjects: string[] = [];
        let bracesCount = 0;
        let currentObject = '';
        let insideObject = false;

        // Scan through text character by character
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '{') {
                bracesCount++;
                if (!insideObject) {
                    insideObject = true;
                    currentObject = '{';
                } else {
                    currentObject += char;
                }
            } else if (char === '}') {
                bracesCount--;
                currentObject += char;

                if (bracesCount === 0 && insideObject) {
                    jsonObjects.push(currentObject);
                    currentObject = '';
                    insideObject = false;
                }
            } else if (insideObject) {
                currentObject += char;
            }
        }

        return jsonObjects;
    }

    /**
     * Clean Markdown formatting and special characters from text
     */
    private static cleanMarkdownAndFormatting(text: string): string {
        return text
            .replace(/```(?:json)?|```/g, '') // Remove code block markers
            .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes with straight quotes
            .trim();
    }

    /**
     * Extract an array from text using regex and pattern matching
     */
    private static extractArray(text: string, options: JsonExtractionOptions): string[] | null {
        // First attempt: Find JSON arrays via regex
        const arrayPattern = /\[((?:"(?:\\.|[^"\\])*"(?:\s*,\s*)?)+)\]/g;
        const matches = [...text.matchAll(arrayPattern)];

        if (matches.length > 0) {
            // Take the first complete array match
            const arrayContent = matches[0][1];

            // Extract all properly quoted strings from the array
            const stringPattern = /"((?:\\.|[^"\\])*)"/g;
            const stringMatches = [...arrayContent.matchAll(stringPattern)];

            if (stringMatches.length > 0) {
                const items = stringMatches
                    .map(m => m[1].trim())
                    .filter(s => s.length >= (options.minStringLength || 3));

                if (items.length > 0) {
                    log.info(`Successfully extracted ${items.length} items using regex pattern`);
                    return items;
                }
            }
        }

        // Second attempt: Try to extract array via standard JSON parsing with fixes
        if (text.includes('[') && text.includes(']')) {
            const arrayMatch = text.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                const arrayText = this.applyJsonFixes(arrayMatch[0]);

                try {
                    const array = JSON.parse(arrayText);
                    if (Array.isArray(array) && array.length > 0) {
                        const items = array
                            .map(item => typeof item === 'string' ? item : String(item))
                            .filter(s => s.length >= (options.minStringLength || 3));

                        if (items.length > 0) {
                            log.info(`Successfully parsed JSON array with ${items.length} items`);
                            return items;
                        }
                    }
                } catch (e) {
                    // Fall through to fallbacks
                }
            }
        }

        return null;
    }

    /**
     * Extract a JSON object using regex and pattern matching
     */
    private static extractObject(text: string): Record<string, any> | null {
        const objectMatch = text.match(/{[\s\S]*}/);
        if (!objectMatch) return null;

        const objectText = this.applyJsonFixes(objectMatch[0]);

        try {
            const parsed = JSON.parse(objectText);
            return parsed;
        } catch (e) {
            return null;
        }
    }

    /**
     * Apply fixes to malformed JSON text
     */
    private static applyJsonFixes(text: string): string {
        let fixed = text;

        // Fix common JSON formatting issues - replace newlines inside the JSON
        fixed = fixed.replace(/\r?\n/g, ' ');

        // Fix unclosed quotes - replace trailing commas before closing brackets
        fixed = fixed.replace(/,\s*]/g, ']');
        fixed = fixed.replace(/,\s*}/g, '}');

        // Fix quotes inside strings
        fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1\'$2\'$3"');

        // Fix missing commas between elements
        fixed = fixed.replace(/"([^"]*)"(?:\s+)"([^"]*)"/g, '"$1", "$2"');

        // Fix missing commas in arrays (quotes with only spaces between them)
        fixed = fixed.replace(/"([^"]*)"\s+"/g, '"$1", "');

        // Fix unclosed quotes before commas
        fixed = fixed.replace(/"([^"]*),\s*(?="|])/g, '"$1", ');

        return fixed;
    }

    /**
     * Extract with fixes and direct JSON parsing
     */
    private static extractWithFixes(text: string): any | null {
        try {
            const fixed = this.applyJsonFixes(text);
            return JSON.parse(fixed);
        } catch (e) {
            return null;
        }
    }

    /**
     * Extract items as a fallback using various patterns
     */
    private static extractItemsAsFallback(text: string, minLength: number = 3): string[] {
        const patterns = [
            /(?:^|\n)["'](.+?)["'](?:,|\n|$)/g,       // Quoted strings
            /(?:^|\n)\[["'](.+?)["']\](?:,|\n|$)/g,   // Single item arrays
            /(?:^|\n)(\d+\.\s*.+?)(?:\n|$)/g,         // Numbered list items
            /(?:^|\n)[-*•]\s*(.+?)(?:\n|$)/g          // Bullet list items
        ];

        const extractedItems = new Set<string>();

        // Try each pattern
        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                if (match[1] && match[1].trim().length >= minLength) {
                    extractedItems.add(match[1].trim());
                }
            }
        }

        // Try line-by-line extraction as last resort
        if (extractedItems.size === 0) {
            const lines = text.split('\n')
                .map(line => line.trim())
                .filter(line =>
                    line.length >= minLength &&
                    !line.startsWith('```') &&
                    !line.match(/^\d+\.?\s*$/) && // Skip numbered list markers alone
                    !line.match(/^\[|\]$/) // Skip lines that are just brackets
                );

            for (const line of lines) {
                // Remove common formatting
                const cleaned = line
                    .replace(/^\d+\.?\s*/, '') // Remove numbered list markers
                    .replace(/^[-*•]\s*/, '')  // Remove bullet list markers
                    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                    .trim();

                if (cleaned.length >= minLength) {
                    extractedItems.add(cleaned);
                }
            }
        }

        return Array.from(extractedItems);
    }
}

export default JsonExtractor;
