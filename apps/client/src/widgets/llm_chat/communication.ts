/**
 * Communication functions for LLM Chat
 */
import server from "../../services/server.js";
import type { SessionResponse } from "./types.js";

/**
 * Create a new chat session
 */
export async function createChatSession(currentNoteId?: string): Promise<{chatNoteId: string | null, noteId: string | null}> {
    try {
        const resp = await server.post<SessionResponse>('llm/chat', {
            title: 'Note Chat',
            currentNoteId: currentNoteId // Pass the current note ID if available
        });

        if (resp && resp.id) {
            // The backend might provide the noteId separately from the chatNoteId
            // If noteId is provided, use it; otherwise, we'll need to query for it separately
            return {
                chatNoteId: resp.id,
                noteId: resp.noteId || null
            };
        }
    } catch (error) {
        console.error('Failed to create chat session:', error);
    }

    return {
        chatNoteId: null,
        noteId: null
    };
}

/**
 * Check if a session exists
 */
export async function checkSessionExists(chatNoteId: string): Promise<boolean> {
    try {
        // Validate that we have a proper note ID format, not a session ID
        // Note IDs in Trilium are typically longer or in a different format
        if (chatNoteId && chatNoteId.length === 16 && /^[A-Za-z0-9]+$/.test(chatNoteId)) {
            console.warn(`Invalid note ID format detected: ${chatNoteId} appears to be a legacy session ID`);
            return false;
        }

        const sessionCheck = await server.getWithSilentNotFound<any>(`llm/chat/${chatNoteId}`);
        return !!(sessionCheck && sessionCheck.id);
    } catch (error: any) {
        console.log(`Error checking chat note ${chatNoteId}:`, error);
        return false;
    }
}

/**
 * Set up streaming response via WebSocket
 */
export async function setupStreamingResponse(
    chatNoteId: string,
    messageParams: any,
    onContentUpdate: (content: string, isDone?: boolean) => void,
    onThinkingUpdate: (thinking: string) => void,
    onToolExecution: (toolData: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
): Promise<void> {
    // Validate that we have a proper note ID format, not a session ID
    if (chatNoteId && chatNoteId.length === 16 && /^[A-Za-z0-9]+$/.test(chatNoteId)) {
        console.error(`Invalid note ID format: ${chatNoteId} appears to be a legacy session ID`);
        onError(new Error("Invalid note ID format - using a legacy session ID"));
        return;
    }

    return new Promise((resolve, reject) => {
        let assistantResponse = '';
        let postToolResponse = ''; // Separate accumulator for post-tool execution content
        let receivedAnyContent = false;
        let receivedPostToolContent = false; // Track if we've started receiving post-tool content
        let timeoutId: number | null = null;
        let initialTimeoutId: number | null = null;
        let cleanupTimeoutId: number | null = null;
        let receivedAnyMessage = false;
        let toolsExecuted = false; // Flag to track if tools were executed in this session
        let toolExecutionCompleted = false; // Flag to track if tool execution is completed
        let eventListener: ((event: Event) => void) | null = null;
        let lastMessageTimestamp = 0;

        // Create a unique identifier for this response process
        const responseId = `llm-stream-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        console.log(`[${responseId}] Setting up WebSocket streaming for chat note ${chatNoteId}`);

        // Send the initial request to initiate streaming
        (async () => {
            try {
                const streamResponse = await server.post<any>(`llm/chat/${chatNoteId}/messages/stream`, {
                    content: messageParams.content,
                    useAdvancedContext: messageParams.useAdvancedContext,
                    showThinking: messageParams.showThinking,
                    options: {
                        temperature: 0.7,
                        maxTokens: 2000
                    }
                });

                if (!streamResponse || !streamResponse.success) {
                    console.error(`[${responseId}] Failed to initiate streaming`);
                    reject(new Error('Failed to initiate streaming'));
                    return;
                }

                console.log(`[${responseId}] Streaming initiated successfully`);
            } catch (error) {
                console.error(`[${responseId}] Error initiating streaming:`, error);
                reject(error);
                return;
            }
        })();

        // Function to safely perform cleanup
        const performCleanup = () => {
            if (cleanupTimeoutId) {
                window.clearTimeout(cleanupTimeoutId);
                cleanupTimeoutId = null;
            }

            console.log(`[${responseId}] Performing final cleanup of event listener`);
            cleanupEventListener(eventListener);
            onComplete();
            resolve();
        };

        // Function to schedule cleanup with ability to cancel
        const scheduleCleanup = (delay: number) => {
            // Clear any existing cleanup timeout
            if (cleanupTimeoutId) {
                window.clearTimeout(cleanupTimeoutId);
            }

            console.log(`[${responseId}] Scheduling listener cleanup in ${delay}ms`);

            // Set new cleanup timeout
            cleanupTimeoutId = window.setTimeout(() => {
                // Only clean up if no messages received recently (in last 2 seconds)
                const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
                if (timeSinceLastMessage > 2000) {
                    performCleanup();
                } else {
                    console.log(`[${responseId}] Received message recently, delaying cleanup`);
                    // Reschedule cleanup
                    scheduleCleanup(2000);
                }
            }, delay);
        };

        // Create a message handler for CustomEvents
        eventListener = (event: Event) => {
            const customEvent = event as CustomEvent;
            const message = customEvent.detail;

            // Only process messages for our chat note
            if (!message || message.chatNoteId !== chatNoteId) {
                return;
            }

            // Update last message timestamp
            lastMessageTimestamp = Date.now();

            // Cancel any pending cleanup when we receive a new message
            if (cleanupTimeoutId) {
                console.log(`[${responseId}] Cancelling scheduled cleanup due to new message`);
                window.clearTimeout(cleanupTimeoutId);
                cleanupTimeoutId = null;
            }

            console.log(`[${responseId}] LLM Stream message received via CustomEvent: chatNoteId=${chatNoteId}, content=${!!message.content}, contentLength=${message.content?.length || 0}, thinking=${!!message.thinking}, toolExecution=${!!message.toolExecution}, done=${!!message.done}, type=${message.type || 'llm-stream'}`);

            // Mark first message received
            if (!receivedAnyMessage) {
                receivedAnyMessage = true;
                console.log(`[${responseId}] First message received for chat note ${chatNoteId}`);

                // Clear the initial timeout since we've received a message
                if (initialTimeoutId !== null) {
                    window.clearTimeout(initialTimeoutId);
                    initialTimeoutId = null;
                }
            }

            // Handle specific message types
            if (message.type === 'tool_execution_start') {
                toolsExecuted = true; // Mark that tools were executed
                onThinkingUpdate('Executing tools...');
                // Also trigger tool execution UI with a specific format
                onToolExecution({
                    action: 'start',
                    tool: 'tools',
                    result: 'Executing tools...'
                });
                return; // Skip accumulating content from this message
            }

            if (message.type === 'tool_result' && message.toolExecution) {
                toolsExecuted = true; // Mark that tools were executed
                console.log(`[${responseId}] Processing tool result: ${JSON.stringify(message.toolExecution)}`);

                // If tool execution doesn't have an action, add 'result' as the default
                if (!message.toolExecution.action) {
                    message.toolExecution.action = 'result';
                }

                // First send a 'start' action to ensure the container is created
                onToolExecution({
                    action: 'start',
                    tool: 'tools',
                    result: 'Tool execution initialized'
                });

                // Then send the actual tool execution data
                onToolExecution(message.toolExecution);

                // Mark tool execution as completed if this is a result or error
                if (message.toolExecution.action === 'result' || message.toolExecution.action === 'complete' || message.toolExecution.action === 'error') {
                    toolExecutionCompleted = true;
                    console.log(`[${responseId}] Tool execution completed`);
                }

                return; // Skip accumulating content from this message
            }

            if (message.type === 'tool_execution_error' && message.toolExecution) {
                toolsExecuted = true; // Mark that tools were executed
                toolExecutionCompleted = true; // Mark tool execution as completed
                onToolExecution({
                    ...message.toolExecution,
                    action: 'error',
                    error: message.toolExecution.error || 'Unknown error during tool execution'
                });
                return; // Skip accumulating content from this message
            }

            if (message.type === 'tool_completion_processing') {
                toolsExecuted = true; // Mark that tools were executed
                toolExecutionCompleted = true; // Tools are done, now processing the result
                onThinkingUpdate('Generating response with tool results...');
                // Also trigger tool execution UI with a specific format
                onToolExecution({
                    action: 'generating',
                    tool: 'tools',
                    result: 'Generating response with tool results...'
                });
                return; // Skip accumulating content from this message
            }

            // Handle content updates
            if (message.content) {
                console.log(`[${responseId}] Received content chunk of length ${message.content.length}, preview: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);

                // If tools were executed and completed, and we're now getting new content,
                // this is likely the final response after tool execution from Anthropic
                if (toolsExecuted && toolExecutionCompleted && message.content) {
                    console.log(`[${responseId}] Post-tool execution content detected`);

                    // If this is the first post-tool chunk, indicate we're starting a new response
                    if (!receivedPostToolContent) {
                        receivedPostToolContent = true;
                        postToolResponse = ''; // Clear any previous post-tool response
                        console.log(`[${responseId}] First post-tool content chunk, starting fresh accumulation`);
                    }

                    // Accumulate post-tool execution content
                    postToolResponse += message.content;
                    console.log(`[${responseId}] Accumulated post-tool content, now ${postToolResponse.length} chars`);

                    // Update the UI with the accumulated post-tool content
                    // This replaces the pre-tool content with our accumulated post-tool content
                    onContentUpdate(postToolResponse, message.done || false);
                } else {
                    // Standard content handling for non-tool cases or initial tool response

                    // Check if this is a duplicated message containing the same content we already have
                    if (message.done && assistantResponse.includes(message.content)) {
                        console.log(`[${responseId}] Ignoring duplicated content in done message`);
                    } else {
                        // Add to our accumulated response
                        assistantResponse += message.content;
                    }

                    // Update the UI immediately with each chunk
                    onContentUpdate(assistantResponse, message.done || false);
                }

                receivedAnyContent = true;

                // Reset timeout since we got content
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }

                // Set new timeout
                timeoutId = window.setTimeout(() => {
                    console.warn(`[${responseId}] Stream timeout for chat note ${chatNoteId}`);

                    // Clean up
                    performCleanup();
                    reject(new Error('Stream timeout'));
                }, 30000);
            }

            // Handle tool execution updates (legacy format and standard format with llm-stream type)
            if (message.toolExecution) {
                // Only process if we haven't already handled this message via specific message types
                if (message.type === 'llm-stream' || !message.type) {
                    console.log(`[${responseId}] Received tool execution update: action=${message.toolExecution.action || 'unknown'}`);
                    toolsExecuted = true; // Mark that tools were executed

                    // Mark tool execution as completed if this is a result or error
                    if (message.toolExecution.action === 'result' ||
                        message.toolExecution.action === 'complete' ||
                        message.toolExecution.action === 'error') {
                        toolExecutionCompleted = true;
                        console.log(`[${responseId}] Tool execution completed via toolExecution message`);
                    }

                    onToolExecution(message.toolExecution);
                }
            }

            // Handle tool calls from the raw data or direct in message (OpenAI format)
            const toolCalls = message.tool_calls || (message.raw && message.raw.tool_calls);
            if (toolCalls && Array.isArray(toolCalls)) {
                console.log(`[${responseId}] Received tool calls: ${toolCalls.length} tools`);
                toolsExecuted = true; // Mark that tools were executed

                // First send a 'start' action to ensure the container is created
                onToolExecution({
                    action: 'start',
                    tool: 'tools',
                    result: 'Tool execution initialized'
                });

                // Then process each tool call
                for (const toolCall of toolCalls) {
                    let args = toolCall.function?.arguments || {};

                    // Try to parse arguments if they're a string
                    if (typeof args === 'string') {
                        try {
                            args = JSON.parse(args);
                        } catch (e) {
                            console.log(`[${responseId}] Could not parse tool arguments as JSON: ${e}`);
                            args = { raw: args };
                        }
                    }

                    onToolExecution({
                        action: 'executing',
                        tool: toolCall.function?.name || 'unknown',
                        toolCallId: toolCall.id,
                        args: args
                    });
                }
            }

            // Handle thinking state updates
            if (message.thinking) {
                console.log(`[${responseId}] Received thinking update: ${message.thinking.substring(0, 50)}...`);
                onThinkingUpdate(message.thinking);
            }

            // Handle completion
            if (message.done) {
                console.log(`[${responseId}] Stream completed for chat note ${chatNoteId}, has content: ${!!message.content}, content length: ${message.content?.length || 0}, current response: ${assistantResponse.length} chars`);

                // Dump message content to console for debugging
                if (message.content) {
                    console.log(`[${responseId}] CONTENT IN DONE MESSAGE (first 200 chars): "${message.content.substring(0, 200)}..."`);

                    // Check if the done message contains the exact same content as our accumulated response
                    // We normalize by removing whitespace to avoid false negatives due to spacing differences
                    const normalizedMessage = message.content.trim();
                    const normalizedResponse = assistantResponse.trim();

                    if (normalizedMessage === normalizedResponse) {
                        console.log(`[${responseId}] Final message is identical to accumulated response, no need to update`);
                    }
                    // If the done message is longer but contains our accumulated response, use the done message
                    else if (normalizedMessage.includes(normalizedResponse) && normalizedMessage.length > normalizedResponse.length) {
                        console.log(`[${responseId}] Final message is more complete than accumulated response, using it`);
                        assistantResponse = message.content;
                    }
                    // If the done message is different and not already included, append it to avoid duplication
                    else if (!normalizedResponse.includes(normalizedMessage) && normalizedMessage.length > 0) {
                        console.log(`[${responseId}] Final message has unique content, using it`);
                        assistantResponse = message.content;
                    }
                    // Otherwise, we already have the content accumulated, so no need to update
                    else {
                        console.log(`[${responseId}] Already have this content accumulated, not updating`);
                    }
                }

                // Clear timeout if set
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                    timeoutId = null;
                }

                // Always mark as done when we receive the done flag
                onContentUpdate(assistantResponse, true);

                // Set a longer delay before cleanup to allow for post-tool execution messages
                // Especially important for Anthropic which may send final message after tool execution
                const cleanupDelay = toolsExecuted ? 15000 : 1000; // 15 seconds if tools were used, otherwise 1 second
                console.log(`[${responseId}] Setting cleanup delay of ${cleanupDelay}ms since toolsExecuted=${toolsExecuted}`);
                scheduleCleanup(cleanupDelay);
            }
        };

        // Register event listener for the custom event
        try {
            window.addEventListener('llm-stream-message', eventListener);
            console.log(`[${responseId}] Event listener added for llm-stream-message events`);
        } catch (err) {
            console.error(`[${responseId}] Error setting up event listener:`, err);
            reject(err);
            return;
        }

        // Set initial timeout for receiving any message
        initialTimeoutId = window.setTimeout(() => {
            console.warn(`[${responseId}] No messages received for initial period in chat note ${chatNoteId}`);
            if (!receivedAnyMessage) {
                console.error(`[${responseId}] WebSocket connection not established for chat note ${chatNoteId}`);

                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }

                // Clean up
                cleanupEventListener(eventListener);

                // Show error message to user
                reject(new Error('WebSocket connection not established'));
            }
        }, 10000);
    });
}

/**
 * Clean up an event listener
 */
function cleanupEventListener(listener: ((event: Event) => void) | null): void {
    if (listener) {
        try {
            window.removeEventListener('llm-stream-message', listener);
            console.log(`Successfully removed event listener`);
        } catch (err) {
            console.error(`Error removing event listener:`, err);
        }
    }
}

/**
 * Get a direct response from the server without streaming
 */
export async function getDirectResponse(chatNoteId: string, messageParams: any): Promise<any> {
    try {
        // Validate that we have a proper note ID format, not a session ID
        if (chatNoteId && chatNoteId.length === 16 && /^[A-Za-z0-9]+$/.test(chatNoteId)) {
            console.error(`Invalid note ID format: ${chatNoteId} appears to be a legacy session ID`);
            throw new Error("Invalid note ID format - using a legacy session ID");
        }

        const postResponse = await server.post<any>(`llm/chat/${chatNoteId}/messages`, {
            message: messageParams.content,
            includeContext: messageParams.useAdvancedContext,
            options: {
                temperature: 0.7,
                maxTokens: 2000
            }
        });

        return postResponse;
    } catch (error) {
        console.error('Error getting direct response:', error);
        throw error;
    }
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(): Promise<any> {
    return server.get('llm/embeddings/stats');
}
