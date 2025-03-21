import log from '../../../log.js';

/**
 * Manages caching for context services
 * Provides a centralized caching system to avoid redundant operations
 */
export class CacheManager {
    // Cache for recently used context to avoid repeated embedding lookups
    private noteDataCache = new Map<string, {
        timestamp: number,
        data: any
    }>();

    // Cache for recently used queries
    private queryCache = new Map<string, {
        timestamp: number,
        results: any
    }>();

    // Default cache expiry (5 minutes)
    private defaultCacheExpiryMs = 5 * 60 * 1000;

    constructor() {
        this.setupCacheCleanup();
    }

    /**
     * Set up periodic cache cleanup
     */
    private setupCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Run cleanup every minute
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();

        // Clean note data cache
        for (const [key, data] of this.noteDataCache.entries()) {
            if (now - data.timestamp > this.defaultCacheExpiryMs) {
                this.noteDataCache.delete(key);
            }
        }

        // Clean query cache
        for (const [key, data] of this.queryCache.entries()) {
            if (now - data.timestamp > this.defaultCacheExpiryMs) {
                this.queryCache.delete(key);
            }
        }
    }

    /**
     * Get cached note data
     */
    getNoteData(noteId: string, type: string): any | null {
        const key = `${noteId}:${type}`;
        const cached = this.noteDataCache.get(key);

        if (cached && Date.now() - cached.timestamp < this.defaultCacheExpiryMs) {
            log.info(`Cache hit for note data: ${key}`);
            return cached.data;
        }

        return null;
    }

    /**
     * Store note data in cache
     */
    storeNoteData(noteId: string, type: string, data: any): void {
        const key = `${noteId}:${type}`;
        this.noteDataCache.set(key, {
            timestamp: Date.now(),
            data
        });
        log.info(`Cached note data: ${key}`);
    }

    /**
     * Get cached query results
     */
    getQueryResults(query: string, contextNoteId: string | null = null): any | null {
        const key = JSON.stringify({ query, contextNoteId });
        const cached = this.queryCache.get(key);

        if (cached && Date.now() - cached.timestamp < this.defaultCacheExpiryMs) {
            log.info(`Cache hit for query: ${query}`);
            return cached.results;
        }

        return null;
    }

    /**
     * Store query results in cache
     */
    storeQueryResults(query: string, results: any, contextNoteId: string | null = null): void {
        const key = JSON.stringify({ query, contextNoteId });
        this.queryCache.set(key, {
            timestamp: Date.now(),
            results
        });
        log.info(`Cached query results: ${query}`);
    }

    /**
     * Clear all caches
     */
    clearAllCaches(): void {
        this.noteDataCache.clear();
        this.queryCache.clear();
        log.info('All context caches cleared');
    }
}

// Export singleton instance
export default new CacheManager();
