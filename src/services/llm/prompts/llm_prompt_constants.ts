/**
 * LLM Prompt Constants
 *
 * This file centralizes all LLM/AI prompts used throughout the application.
 * When adding new prompts, please add them here rather than hardcoding them in other files.
 *
 * Prompts are organized by their usage context (e.g., service, feature, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load system prompt from markdown file
const loadSystemPrompt = (): string => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const promptPath = path.join(__dirname, 'base_system_prompt.md');
        const promptContent = fs.readFileSync(promptPath, 'utf8');
        // Strip the markdown title if needed
        return promptContent.replace(/^# TriliumNext Base System Prompt\n+/, '');
    } catch (error) {
        console.error('Failed to load system prompt from file:', error);
        // Return fallback prompt if file can't be loaded
        return "You are a helpful assistant embedded in the TriliumNext Notes application. " +
            "You can help users with their notes, answer questions, and provide information. " +
            "Keep your responses concise and helpful. " +
            "You're currently chatting with the user about their notes.";
    }
};

// Base system prompt loaded from markdown file
export const DEFAULT_SYSTEM_PROMPT = loadSystemPrompt();

// Context-specific prompts
export const CONTEXT_PROMPTS = {
    // Query enhancer prompt for generating better search terms
    QUERY_ENHANCER:
        `You are an AI assistant that decides what information needs to be retrieved from a user's knowledge base called TriliumNext Notes to answer the user's question.
Given the user's question, generate 3-5 specific search queries that would help find relevant information.
Each query should be focused on a different aspect of the question.
Avoid generating queries that are too broad, vague, or about a user's entire Note database, and make sure they are relevant to the user's question.
Format your answer as a JSON array of strings, with each string being a search query.
Example: ["exact topic mentioned", "related concept 1", "related concept 2"]`,

    // Used to format notes context when providing responses
    CONTEXT_NOTES_WRAPPER:
        `I'll provide you with relevant information from my notes to help answer your question.

{noteContexts}

When referring to information from these notes in your response, please cite them by their titles (e.g., "According to your note on [Title]...") rather than using labels like "Note 1" or "Note 2".

Now, based on the above information, please answer: {query}`,

    // Default fallback when no notes are found
    NO_NOTES_CONTEXT:
        "I am an AI assistant helping you with your Trilium notes. " +
        "I couldn't find any specific notes related to your query, but I'll try to assist you " +
        "with general knowledge about Trilium or other topics you're interested in.",

    // Fallback when context building fails
    ERROR_FALLBACK_CONTEXT:
        "I'm your AI assistant helping with your Trilium notes. I'll try to answer based on what I know.",

    // Headers for context (by provider)
    CONTEXT_HEADERS: {
        ANTHROPIC: (query: string) =>
            `I'm your AI assistant helping with your Trilium notes database. For your query: "${query}", I found these relevant notes:\n\n`,
        DEFAULT: (query: string) =>
            `I've found some relevant information in your notes that may help answer: "${query}"\n\n`
    },

    // Closings for context (by provider)
    CONTEXT_CLOSINGS: {
        ANTHROPIC:
            "\n\nPlease use this information to answer the user's query. If the notes don't contain enough information, you can use your general knowledge as well.",
        DEFAULT:
            "\n\nBased on this information from the user's notes, please provide a helpful response."
    },

    // Context for index service
    INDEX_NO_NOTES_CONTEXT:
        "I'm an AI assistant helping with your Trilium notes. I couldn't find specific notes related to your query, but I'll try to assist based on general knowledge."
};

// Agent tool prompts
export const AGENT_TOOL_PROMPTS = {
    // Prompts for query decomposition
    QUERY_DECOMPOSITION: {
        SUB_QUERY_DIRECT: 'Direct question that can be answered without decomposition',
        SUB_QUERY_GENERIC: 'Generic exploration to find related content',
        SUB_QUERY_ERROR: 'Error in decomposition, treating as simple query',
        SUB_QUERY_DIRECT_ANALYSIS: 'Direct analysis of note details',
        ORIGINAL_QUERY: 'Original query'
    },

    // Prompts for contextual thinking tool
    CONTEXTUAL_THINKING: {
        STARTING_ANALYSIS: (query: string) => `Starting analysis of the query: "${query}"`,
        KEY_COMPONENTS: 'What are the key components of this query that need to be addressed?',
        BREAKING_DOWN: 'Breaking down the query to understand its requirements and context.'
    }
};

// Provider-specific prompt modifiers
export const PROVIDER_PROMPTS = {
    ANTHROPIC: {
        // Any Anthropic Claude-specific prompt modifications would go here
    },
    OPENAI: {
        // Any OpenAI-specific prompt modifications would go here
    },
    OLLAMA: {
        // Any Ollama-specific prompt modifications would go here
    }
};
