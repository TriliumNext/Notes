-- Add new options for AI/LLM integration
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('aiEnabled', 'false', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- OpenAI settings
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('openaiApiKey', '', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('openaiDefaultModel', 'gpt-4o', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('openaiBaseUrl', 'https://api.openai.com/v1', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Anthropic settings  
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('anthropicApiKey', '', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('anthropicDefaultModel', 'claude-3-opus-20240229', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('anthropicBaseUrl', 'https://api.anthropic.com/v1', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Ollama settings
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('ollamaEnabled', 'false', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('ollamaBaseUrl', 'http://localhost:11434', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('ollamaDefaultModel', 'llama3', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('ollamaEmbeddingModel', 'nomic-embed-text', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- General AI settings
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('aiProviderPrecedence', 'openai,anthropic,ollama', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('aiTemperature', '0.7', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('aiSystemPrompt', '', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Embedding settings
INSERT INTO options (name, value, isSynced, utcDateModified) VALUES ('embeddingsDefaultProvider', 'openai', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')); 