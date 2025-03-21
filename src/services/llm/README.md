# Trilium Context Service

This directory contains Trilium's context management services, which are responsible for providing relevant context to LLM models when generating responses.

## Structure

The context system has been refactored into a modular architecture:

```
context/
  ├── index.ts              - Base context extractor
  ├── semantic_context.ts   - Semantic context utilities
  ├── hierarchy.ts          - Note hierarchy context utilities
  ├── code_handlers.ts      - Code-specific context handling
  ├── content_chunking.ts   - Content chunking utilities
  ├── note_content.ts       - Note content processing
  ├── summarization.ts      - Content summarization utilities
  ├── modules/              - Modular context services
  │   ├── provider_manager.ts  - Embedding provider management
  │   ├── cache_manager.ts     - Caching system
  │   ├── semantic_search.ts   - Semantic search functionality
  │   ├── query_enhancer.ts    - Query enhancement
  │   ├── context_formatter.ts - Context formatting
  │   └── context_service.ts   - Main context service
  └── README.md             - This documentation
```

## Main Entry Points

- `context_service.ts` - Main entry point for modern code
- `semantic_context_service.ts` - Compatibility wrapper for old code (deprecated)
- `trilium_context_service.ts` - Compatibility wrapper for old code (deprecated)

## Usage

### For new code:

```typescript
import aiServiceManager from '../services/llm/ai_service_manager.js';

// Get the context service
const contextService = aiServiceManager.getContextService();

// Process a query to get relevant context
const result = await contextService.processQuery(
    "What are my notes about programming?",
    llmService,
    currentNoteId,
    false // showThinking
);

// Get semantic context
const context = await contextService.getSemanticContext(noteId, userQuery);

// Get context that adapts to query complexity
const smartContext = await contextService.getSmartContext(noteId, userQuery);
```

### For legacy code (deprecated):

```typescript
import aiServiceManager from '../services/llm/ai_service_manager.js';

// Get the semantic context service (deprecated)
const semanticContext = aiServiceManager.getSemanticContextService();

// Get context
const context = await semanticContext.getSemanticContext(noteId, userQuery);
```

## Modules

### Provider Manager

Handles embedding provider selection and management:

```typescript
import providerManager from './context/modules/provider_manager.js';

// Get the preferred embedding provider
const provider = await providerManager.getPreferredEmbeddingProvider();

// Generate embeddings for a query
const embedding = await providerManager.generateQueryEmbedding(query);
```

### Cache Manager

Provides caching for context data:

```typescript
import cacheManager from './context/modules/cache_manager.js';

// Get cached data
const cached = cacheManager.getNoteData(noteId, 'content');

// Store data in cache
cacheManager.storeNoteData(noteId, 'content', data);

// Clear caches
cacheManager.clearAllCaches();
```

### Semantic Search

Handles semantic search functionality:

```typescript
import semanticSearch from './context/modules/semantic_search.js';

// Find relevant notes
const notes = await semanticSearch.findRelevantNotes(query, contextNoteId);

// Rank notes by relevance
const ranked = await semanticSearch.rankNotesByRelevance(notes, query);
```

### Query Enhancer

Provides query enhancement:

```typescript
import queryEnhancer from './context/modules/query_enhancer.js';

// Generate multiple search queries from a user question
const queries = await queryEnhancer.generateSearchQueries(question, llmService);

// Estimate query complexity
const complexity = queryEnhancer.estimateQueryComplexity(query);
```

### Context Formatter

Formats context for LLM consumption:

```typescript
import contextFormatter from './context/modules/context_formatter.js';

// Build formatted context from notes
const context = await contextFormatter.buildContextFromNotes(notes, query, providerId);

// Sanitize note content
const clean = contextFormatter.sanitizeNoteContent(content, type, mime);
``` 