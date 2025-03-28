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

        const promptPath = path.join(__dirname, '../prompts/base_system_prompt.md');
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
        "I'm an AI assistant helping with your Trilium notes. I couldn't find specific notes related to your query, but I'll try to assist based on general knowledge.",

    // Prompt for adding note context to chat
    NOTE_CONTEXT_PROMPT: `Here is the content of the note I want to discuss:

{context}

Please help me with this information.`,

    // Prompt for adding semantic note context to chat
    SEMANTIC_NOTE_CONTEXT_PROMPT: `Here is the relevant information from my notes based on my query "{query}":

{context}

Please help me understand this information in relation to my query.`,

    // System message prompt for context-aware chat
    CONTEXT_AWARE_SYSTEM_PROMPT: `You are an AI assistant helping with Trilium Notes. Use this context to answer the user's question:

{enhancedContext}`,

    // Error messages
    ERROR_MESSAGES: {
        GENERAL_ERROR: `Error: Failed to generate response. {errorMessage}`,
        CONTEXT_ERROR: `Error: Failed to generate response with note context. {errorMessage}`
    }
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
        // Anthropic Claude-specific prompt formatting
        SYSTEM_WITH_CONTEXT: (context: string) =>
            `<instructions>
${DEFAULT_SYSTEM_PROMPT}

Use the following information from the user's notes to answer their questions:

<user_notes>
${context}
</user_notes>

When responding:
- Focus on the most relevant information from the notes
- Be concise and direct in your answers
- If quoting from notes, mention which note it's from
- If the notes don't contain relevant information, say so clearly
</instructions>`,

        INSTRUCTIONS_WRAPPER: (instructions: string) =>
            `<instructions>\n${instructions}\n</instructions>`,

        ACKNOWLEDGMENT: "I understand. I'll follow those instructions.",
        CONTEXT_ACKNOWLEDGMENT: "I'll help you with your notes based on the context provided.",
        CONTEXT_QUERY_ACKNOWLEDGMENT: "I'll help you with your notes based on the context provided. What would you like to know?"
    },

    OPENAI: {
        // OpenAI-specific prompt formatting
        SYSTEM_WITH_CONTEXT: (context: string) =>
            `You are an AI assistant integrated into TriliumNext Notes.
Use the following information from the user's notes to answer their questions:

${context}

Focus on relevant information from these notes when answering.
Be concise and informative in your responses.`
    },

    OLLAMA: {
        // Ollama-specific prompt formatting
        CONTEXT_INJECTION: (context: string, query: string) =>
            `Here's information from my notes to help answer the question:

${context}

Based on this information, please answer: ${query}`
    },

    // Common prompts across providers
    COMMON: {
        DEFAULT_ASSISTANT_INTRO: "You are an AI assistant integrated into TriliumNext Notes. Focus on helping users find information in their notes and answering questions based on their knowledge base. Be concise, informative, and direct when responding to queries."
    }
};

// Constants for formatting context and messages
export const FORMATTING_PROMPTS = {
    // Headers for context formatting
    CONTEXT_HEADERS: {
        SIMPLE: (query: string) => `I'm searching for information about: ${query}\n\nHere are the most relevant notes from my knowledge base:`,
        DETAILED: (query: string) => `I'm searching for information about: "${query}"\n\nHere are the most relevant notes from my personal knowledge base:`
    },

    // Closing text for context formatting
    CONTEXT_CLOSERS: {
        SIMPLE: `End of notes. Please use this information to answer my question comprehensively.`,
        DETAILED: `End of context information. Please use only the above notes to answer my question as comprehensively as possible.`
    },

    // Dividers used in context formatting
    DIVIDERS: {
        NOTE_SECTION: `------ NOTE INFORMATION ------`,
        CONTENT_SECTION: `------ CONTEXT INFORMATION ------`,
        NOTE_START: `# Note: `,
        CONTENT_START: `Content: `
    },

    HTML_ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'code', 'pre']
};

// Prompt templates for chat service
export const CHAT_PROMPTS = {
    // Introduction messages for new chats
    INTRODUCTIONS: {
        NEW_CHAT: "Welcome to TriliumNext AI Assistant. How can I help you with your notes today?",
        SEMANTIC_SEARCH: "I'll search through your notes for relevant information. What would you like to know?"
    },

    // Placeholders for various chat scenarios
    PLACEHOLDERS: {
        NO_CONTEXT: "I don't have any specific note context yet. Would you like me to search your notes for something specific?",
        WAITING_FOR_QUERY: "Awaiting your question..."
    }
};

// Error messages and fallbacks
export const ERROR_PROMPTS = {
    // User-facing error messages
    USER_ERRORS: {
        GENERAL_ERROR: "I encountered an error processing your request. Please try again or rephrase your question.",
        CONTEXT_ERROR: "I couldn't retrieve context from your notes. Please check your query or try a different question.",
        NETWORK_ERROR: "There was a network error connecting to the AI service. Please check your connection and try again.",
        RATE_LIMIT: "The AI service is currently experiencing high demand. Please try again in a moment."
    },

    // Internal error handling
    INTERNAL_ERRORS: {
        CONTEXT_PROCESSING: "Error processing context data",
        MESSAGE_FORMATTING: "Error formatting messages for LLM",
        RESPONSE_PARSING: "Error parsing LLM response"
    }
};
