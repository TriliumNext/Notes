/**
 * Interfaces for WebSocket LLM streaming messages
 */

/**
 * Interface for WebSocket LLM streaming messages
 */
export interface LLMStreamMessage {
    type: 'llm-stream' | 'tool_execution_start' | 'tool_result' | 'tool_execution_error' | 'tool_completion_processing';
    chatNoteId: string;
    content?: string;
    thinking?: string;
    toolExecution?: {
        action?: string;
        tool?: string;
        toolCallId?: string;
        result?: string | Record<string, any>;
        error?: string;
        args?: Record<string, unknown>;
    };
    done?: boolean;
    error?: string;
    raw?: unknown;
}
