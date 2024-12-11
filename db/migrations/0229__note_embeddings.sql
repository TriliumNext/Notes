CREATE TABLE IF NOT EXISTS "note_embeddings" (
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

CREATE INDEX IF NOT EXISTS IDX_note_embeddings_noteId ON note_embeddings (noteId);
CREATE INDEX IF NOT EXISTS IDX_note_embeddings_model ON note_embeddings (model);

INSERT INTO options (name, value, isSynced, utcDateModified)
VALUES 
('llmEnabled', 'false', 1, datetime('now')),
('llmProvider', 'ollama', 1, datetime('now')),
('llmModel', 'llama2', 1, datetime('now')),
('llmBaseUrl', 'http://localhost:11434', 1, datetime('now')),
('llmMaxTokens', '2000', 1, datetime('now')),
('llmTemperature', '0.7', 1, datetime('now')),
('llmApiKey', '', 1, datetime('now')); 