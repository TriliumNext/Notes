import type { NoteEmbeddingContext } from "../types.js";
import type { EmbeddingProvider } from "../embeddings_interface.js";

/**
 * Interface for chunking operations
 */
export interface ChunkingOperations {
    /**
     * Process a large note by breaking it into chunks and creating embeddings for each chunk
     */
    processNoteWithChunking(
        noteId: string,
        provider: EmbeddingProvider,
        context: NoteEmbeddingContext
    ): Promise<void>;
}

/**
 * Get the chunking operations instance
 * This function is implemented to break circular dependencies
 */
export async function getChunkingOperations(): Promise<ChunkingOperations> {
    const chunking = await import('./chunking_processor.js');
    return chunking;
}
