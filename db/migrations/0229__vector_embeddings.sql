-- Add tables for vector embeddings storage and management
-- This migration adds embedding support to the main document.db database

-- Store embeddings for notes
CREATE TABLE IF NOT EXISTS "note_embeddings" (
    "embedId" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "embedding" BLOB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dateCreated" TEXT NOT NULL,
    "utcDateCreated" TEXT NOT NULL,
    "dateModified" TEXT NOT NULL,
    "utcDateModified" TEXT NOT NULL
);

CREATE INDEX "IDX_note_embeddings_noteId" ON "note_embeddings" ("noteId");
CREATE INDEX "IDX_note_embeddings_providerId_modelId" ON "note_embeddings" ("providerId", "modelId");

-- Table to track which notes need embedding updates
CREATE TABLE IF NOT EXISTS "embedding_queue" (
    "noteId" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL, -- CREATE, UPDATE, DELETE
    "dateQueued" TEXT NOT NULL,
    "utcDateQueued" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TEXT NULL,
    "error" TEXT NULL,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "isProcessing" INTEGER NOT NULL DEFAULT 0
);

-- Table to store embedding provider configurations
CREATE TABLE IF NOT EXISTS "embedding_providers" (
    "providerId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isEnabled" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT NOT NULL, -- JSON config object
    "dateCreated" TEXT NOT NULL,
    "utcDateCreated" TEXT NOT NULL,
    "dateModified" TEXT NOT NULL,
    "utcDateModified" TEXT NOT NULL
);