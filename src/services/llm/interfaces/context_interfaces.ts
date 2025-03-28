/**
 * Interface for note data in cache
 */
export interface CachedNoteData<T> {
  timestamp: number;
  data: T;
}

/**
 * Interface for query results in cache
 */
export interface CachedQueryResults<T> {
  timestamp: number;
  results: T;
}

/**
 * Interface for cache manager
 */
export interface ICacheManager {
  getNoteData<T>(noteId: string, type: string): T | null;
  storeNoteData<T>(noteId: string, type: string, data: T): void;
  getQueryResults<T>(query: string, contextNoteId: string | null): T | null;
  storeQueryResults<T>(query: string, results: T, contextNoteId: string | null): void;
  cleanupCache(): void;
  clearAllCaches(): void;
}

/**
 * Interface for note data in search results
 */
export interface NoteSearchResult {
  noteId: string;
  title: string;
  content?: string | null;
  type?: string;
  mime?: string;
  similarity: number;
  parentId?: string;
  parentTitle?: string;
  dateCreated?: string;
  dateModified?: string;
}

/**
 * Interface for context formatter
 */
export interface IContextFormatter {
  buildContextFromNotes(sources: NoteSearchResult[], query: string, providerId?: string): Promise<string>;
}

/**
 * Interface for query enhancer
 */
export interface IQueryEnhancer {
  generateSearchQueries(userQuestion: string, llmService: {
    generateChatCompletion: (messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>, options?: {
      temperature?: number;
      maxTokens?: number;
    }) => Promise<{
      text: string;
    }>;
  }): Promise<string[]>;
}

/**
 * Interface for content chunk
 */
export interface ContentChunk {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for note chunk
 */
export interface NoteChunk {
  noteId: string;
  title: string;
  content: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for content chunking service
 */
export interface IContentChunker {
  chunkContent(content: string, metadata?: Record<string, unknown>): ContentChunk[];
  chunkNoteContent(noteId: string, content: string, title: string): Promise<NoteChunk[]>;
}
