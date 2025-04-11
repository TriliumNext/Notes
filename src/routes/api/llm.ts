import type { Request, Response } from "express";
import log from "../../services/log.js";
import options from "../../services/options.js";

// Import the index service for knowledge base management
import indexService from "../../services/llm/index_service.js";
import restChatService from "../../services/llm/rest_chat_service.js";

// Define basic interfaces
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastActive: Date;
    noteContext?: string; // Optional noteId that provides context
    metadata: Record<string, any>;
}

interface NoteSource {
    noteId: string;
    title: string;
    content?: string;
    similarity?: number;
    branchId?: string;
}

interface SessionOptions {
    title?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    provider?: string;
    contextNoteId?: string;
}

// In-memory storage for sessions
// In a production app, this should be stored in a database
const sessions = restChatService.getSessions();

// Flag to track if cleanup timer has been initialized
let cleanupInitialized = false;

/**
 * Initialize the session cleanup timer to remove old/inactive sessions
 * Only call this after database is initialized
 */
function initializeCleanupTimer() {
    restChatService.initializeCleanupTimer();
    cleanupInitialized = true;
}

/**
 * Check if the database is initialized
 */
function isDatabaseInitialized(): boolean {
    return restChatService.isDatabaseInitialized();
}

/**
 * Get the AI service manager in a way that doesn't crash at startup
 */
function safelyUseAIManager(): boolean {
    return restChatService.safelyUseAIManager();
}

/**
 * @swagger
 * /api/llm/sessions:
 *   post:
 *     summary: Create a new LLM chat session
 *     operationId: llm-create-session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the chat session
 *               systemPrompt:
 *                 type: string
 *                 description: System message to set the behavior of the assistant
 *               temperature:
 *                 type: number
 *                 description: Temperature parameter for the LLM (0.0-1.0)
 *               maxTokens:
 *                 type: integer
 *                 description: Maximum tokens to generate in responses
 *               model:
 *                 type: string
 *                 description: Specific model to use (depends on provider)
 *               provider:
 *                 type: string
 *                 description: LLM provider to use (e.g., 'openai', 'anthropic', 'ollama')
 *               contextNoteId:
 *                 type: string
 *                 description: Note ID to use as context for the session
 *     responses:
 *       '200':
 *         description: Successfully created session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 title:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function createSession(req: Request, res: Response) {
    return restChatService.createSession(req, res);
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   get:
 *     summary: Retrieve a specific chat session by ID
 *     operationId: llm-get-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Chat session details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [user, assistant, system]
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 lastActive:
 *                   type: string
 *                   format: date-time
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getSession(req: Request, res: Response) {
    return restChatService.getSession(req, res);
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   put:
 *     summary: Update a chat session's settings
 *     operationId: llm-update-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title for the session
 *               systemPrompt:
 *                 type: string
 *                 description: Updated system prompt
 *               temperature:
 *                 type: number
 *                 description: Updated temperature setting
 *               maxTokens:
 *                 type: integer
 *                 description: Updated maximum tokens setting
 *               model:
 *                 type: string
 *                 description: Updated model selection
 *               provider:
 *                 type: string
 *                 description: Updated provider selection
 *               contextNoteId:
 *                 type: string
 *                 description: Updated note ID for context
 *     responses:
 *       '200':
 *         description: Session successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function updateSession(req: Request, res: Response) {
    return restChatService.updateSession(req, res);
}

/**
 * @swagger
 * /api/llm/sessions:
 *   get:
 *     summary: List all chat sessions
 *     operationId: llm-list-sessions
 *     responses:
 *       '200':
 *         description: List of chat sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   lastActive:
 *                     type: string
 *                     format: date-time
 *                   messageCount:
 *                     type: integer
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function listSessions(req: Request, res: Response) {
    return restChatService.listSessions(req, res);
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a chat session
 *     operationId: llm-delete-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Session successfully deleted
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function deleteSession(req: Request, res: Response) {
    return restChatService.deleteSession(req, res);
}

/**
 * Find relevant notes based on search query
 */
async function findRelevantNotes(content: string, contextNoteId: string | null = null, limit = 5): Promise<NoteSource[]> {
    return restChatService.findRelevantNotes(content, contextNoteId, limit);
}

/**
 * Build a prompt with context from relevant notes
 */
function buildContextFromNotes(sources: NoteSource[], query: string): string {
    return restChatService.buildContextFromNotes(sources, query);
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message to an LLM and get a response
 *     operationId: llm-send-message
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user message to send to the LLM
 *               options:
 *                 type: object
 *                 description: Optional parameters for this specific message
 *                 properties:
 *                   temperature:
 *                     type: number
 *                   maxTokens:
 *                     type: integer
 *                   model:
 *                     type: string
 *                   provider:
 *                     type: string
 *               includeContext:
 *                 type: boolean
 *                 description: Whether to include relevant notes as context
 *               useNoteContext:
 *                 type: boolean
 *                 description: Whether to use the session's context note
 *     responses:
 *       '200':
 *         description: LLM response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       similarity:
 *                         type: number
 *                 sessionId:
 *                   type: string
 *       '404':
 *         description: Session not found
 *       '500':
 *         description: Error processing request
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function sendMessage(req: Request, res: Response) {
    return restChatService.handleSendMessage(req, res);
}

/**
 * @swagger
 * /api/llm/indexes/stats:
 *   get:
 *     summary: Get stats about the LLM knowledge base indexing status
 *     operationId: llm-index-stats
 *     responses:
 *       '200':
 *         description: Index stats successfully retrieved
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getIndexStats(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        // Return indexing stats
        const stats = await indexService.getIndexingStats();
        return {
            success: true,
            ...stats
        };
    } catch (error: any) {
        log.error(`Error getting index stats: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to get index stats: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes:
 *   post:
 *     summary: Start or continue indexing the knowledge base
 *     operationId: llm-start-indexing
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 description: Whether to force reindexing of all notes
 *     responses:
 *       '200':
 *         description: Indexing started successfully
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function startIndexing(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const { force = false } = req.body;

        // Start indexing
        await indexService.startFullIndexing(force);

        return {
            success: true,
            message: "Indexing started"
        };
    } catch (error: any) {
        log.error(`Error starting indexing: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to start indexing: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/failed:
 *   get:
 *     summary: Get list of notes that failed to index
 *     operationId: llm-failed-indexes
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       '200':
 *         description: Failed indexes successfully retrieved
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getFailedIndexes(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const limit = parseInt(req.query.limit as string || "100", 10);

        // Get failed indexes
        const failed = await indexService.getFailedIndexes(limit);

        return {
            success: true,
            failed
        };
    } catch (error: any) {
        log.error(`Error getting failed indexes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to get failed indexes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/notes/{noteId}:
 *   put:
 *     summary: Retry indexing a specific note that previously failed
 *     operationId: llm-retry-index
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Index retry successfully initiated
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryFailedIndex(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const { noteId } = req.params;

        // Retry indexing the note
        const result = await indexService.retryFailedNote(noteId);

        return {
            success: true,
            message: result ? "Note queued for indexing" : "Failed to queue note for indexing"
        };
    } catch (error: any) {
        log.error(`Error retrying failed index: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to retry index: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/failed:
 *   put:
 *     summary: Retry indexing all failed notes
 *     operationId: llm-retry-all-indexes
 *     responses:
 *       '200':
 *         description: Retry of all failed indexes successfully initiated
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryAllFailedIndexes(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        // Retry all failed notes
        const count = await indexService.retryAllFailedNotes();

        return {
            success: true,
            message: `${count} notes queued for reprocessing`
        };
    } catch (error: any) {
        log.error(`Error retrying all failed indexes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to retry all indexes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/notes/similar:
 *   get:
 *     summary: Find notes similar to a query string
 *     operationId: llm-find-similar-notes
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: contextNoteId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       '200':
 *         description: Similar notes found successfully
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function findSimilarNotes(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const query = req.query.query as string;
        const contextNoteId = req.query.contextNoteId as string | undefined;
        const limit = parseInt(req.query.limit as string || "5", 10);

        if (!query) {
            return {
                success: false,
                message: "Query is required"
            };
        }

        // Find similar notes
        const similar = await indexService.findSimilarNotes(query, contextNoteId, limit);

        return {
            success: true,
            similar
        };
    } catch (error: any) {
        log.error(`Error finding similar notes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to find similar notes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/context:
 *   get:
 *     summary: Generate context for an LLM query based on the knowledge base
 *     operationId: llm-generate-context
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: contextNoteId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: depth
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 2
 *     responses:
 *       '200':
 *         description: Context generated successfully
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function generateQueryContext(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const query = req.query.query as string;
        const contextNoteId = req.query.contextNoteId as string | undefined;
        const depth = parseInt(req.query.depth as string || "2", 10);

        if (!query) {
            return {
                success: false,
                message: "Query is required"
            };
        }

        // Generate context
        const context = await indexService.generateQueryContext(query, contextNoteId, depth);

        return {
            success: true,
            context
        };
    } catch (error: any) {
        log.error(`Error generating query context: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to generate query context: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/indexes/notes/{noteId}:
 *   post:
 *     summary: Index a specific note for LLM knowledge base
 *     operationId: llm-index-note
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Note indexed successfully
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function indexNote(req: Request, res: Response) {
    try {
        // Check if AI is enabled
        const aiEnabled = await options.getOptionBool('aiEnabled');
        if (!aiEnabled) {
            return {
                success: false,
                message: "AI features are disabled"
            };
        }

        const { noteId } = req.params;

        if (!noteId) {
            return {
                success: false,
                message: "Note ID is required"
            };
        }

        // Index the note
        const result = await indexService.generateNoteIndex(noteId);

        return {
            success: true,
            message: result ? "Note indexed successfully" : "Failed to index note"
        };
    } catch (error: any) {
        log.error(`Error indexing note: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to index note: ${error.message || 'Unknown error'}`);
    }
}

export default {
    // Chat session management
    createSession,
    getSession,
    updateSession,
    listSessions,
    deleteSession,
    sendMessage,

    // Knowledge base index management
    getIndexStats,
    startIndexing,
    getFailedIndexes,
    retryFailedIndex,
    retryAllFailedIndexes,
    findSimilarNotes,
    generateQueryContext,
    indexNote
};
