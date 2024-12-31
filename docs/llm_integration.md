# LLM Integration in Notes

Notes now includes built-in support for Large Language Models (LLMs), allowing you to chat with your notes and generate embeddings for semantic search. The integration is designed to be provider-agnostic, supporting various LLM providers such as OpenAI, Ollama, and others.

## Features

1. Chat with your notes
   - Access the chat interface from the right panel
   - Chat uses the context of your current note
   - Supports markdown formatting in responses

2. LLM Provider Configuration
   - Configure your preferred LLM provider in Settings -> Appearance -> LLM Settings
   - Supported providers:
     - Ollama (default, requires local installation)
     - OpenAI (requires API key)

3. Note Embeddings
   - Automatically generates embeddings for your notes
   - Embeddings are used for semantic search and finding similar notes
   - Embeddings are stored locally in the SQLite database

## Setup

### Using Ollama (Default)

1. Install Ollama from https://ollama.ai/
2. Start the Ollama service
3. In Notes, go to Settings -> Appearance -> LLM Settings
4. Select "Ollama" as the provider
5. Set the model (default: "llama2")
6. Configure the base URL if needed (default: "http://localhost:11434")

### Using OpenAI

1. Get an API key from OpenAI
2. In Notes, go to Settings -> Appearance -> LLM Settings
3. Select "OpenAI" as the provider
4. Enter your API key
5. Set the model (default: "gpt-3.5-turbo")

## Usage

### Chatting with Notes

1. Open a note you want to chat about
2. Click the "Chat" tab in the right panel
3. Type your message and press Enter or click Send
4. The LLM will respond using the context from your current note

### LLM Settings

Access LLM settings through:
1. Settings menu
2. Appearance section
3. Click "Configure LLM" button

Available settings:
- Provider selection
- Model selection
- API key (for OpenAI)
- Base URL (for Ollama)
- Temperature (controls response randomness)
- Max tokens (controls response length)

## Technical Details

### Embeddings Storage

Embeddings are stored in the `note_embeddings` table with the following schema:
```sql
CREATE TABLE note_embeddings (
    embeddingId TEXT NOT NULL PRIMARY KEY,
    noteId TEXT NOT NULL,
    model TEXT NOT NULL,
    vector BLOB NOT NULL,
    dimension INTEGER NOT NULL,
    utcDateCreated TEXT NOT NULL,
    utcDateModified TEXT NOT NULL,
    isDeleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(noteId) REFERENCES notes(noteId)
);
```

### Synchronization

Embeddings are considered local to each client and are not synchronized between devices. This is because:
1. Embeddings can be regenerated on each client
2. Different clients might use different LLM providers or models
3. Reduces sync data size and complexity

### API Endpoints

The following API endpoints are available:

- `POST /api/llm/chat` - Send a chat message
- `POST /api/llm/embeddings/:noteId` - Generate embeddings for a note
- `GET /api/llm/config` - Get LLM configuration
- `PUT /api/llm/config` - Update LLM configuration

## Contributing

The LLM integration is designed to be extensible. To add support for a new LLM provider:

1. Create a new provider class in `src/services/llm/providers/`
2. Implement the `LLMProvider` interface
3. Register the provider in `src/services/llm/llm_service.ts`

