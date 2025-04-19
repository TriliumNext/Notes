// Interface for the Ollama model response
export interface OllamaModelResponse {
    success: boolean;
    models: Array<{
        name: string;
        model: string;
        details?: {
            family?: string;
            parameter_size?: string;
        }
    }>;
}

// Interface for embedding statistics
export interface EmbeddingStats {
    success: boolean;
    stats: {
        totalNotesCount: number;
        embeddedNotesCount: number;
        queuedNotesCount: number;
        failedNotesCount: number;
        lastProcessedDate: string | null;
        percentComplete: number;
    }
}

// Interface for failed embedding notes
export interface FailedEmbeddingNotes {
    success: boolean;
    failedNotes: Array<{
        noteId: string;
        title?: string;
        operation: string;
        attempts: number;
        lastAttempt: string;
        error: string;
        failureType: string;
        chunks: number;
        isPermanent: boolean;
    }>;
}

export interface OpenAIModelResponse {
    success: boolean;
    chatModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    embeddingModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
}

export interface AnthropicModelResponse {
    success: boolean;
    chatModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    embeddingModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
}