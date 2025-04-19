/**
 * Types for LLM Chat Panel
 */

export interface ChatResponse {
    id: string;
    messages: Array<{role: string; content: string}>;
    sources?: Array<{noteId: string; title: string}>;
}

export interface SessionResponse {
    id: string;
    title: string;
    noteId?: string;
}

export interface ToolExecutionStep {
    type: string;
    name?: string;
    content: string;
}

export interface MessageData {
    role: string;
    content: string;
    timestamp?: Date;
}

export interface ChatData {
    messages: MessageData[];
    chatNoteId: string | null;
    noteId?: string | null;
    toolSteps: ToolExecutionStep[];
    sources?: Array<{
        noteId: string;
        title: string;
        similarity?: number;
        content?: string;
    }>;
    metadata?: {
        model?: string;
        provider?: string;
        temperature?: number;
        maxTokens?: number;
        lastUpdated?: string;
        toolExecutions?: Array<{
            id: string;
            name: string;
            arguments: any;
            result: any;
            error?: string;
            timestamp: string;
        }>;
    };
}
