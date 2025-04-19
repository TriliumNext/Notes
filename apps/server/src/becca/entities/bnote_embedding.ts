import AbstractBeccaEntity from "./abstract_becca_entity.js";
import dateUtils from "../../services/date_utils.js";
import type { NoteEmbeddingRow } from "@triliumnext/commons";

/**
 * Entity representing a note's vector embedding for semantic search and AI features
 */
class BNoteEmbedding extends AbstractBeccaEntity<BNoteEmbedding> {
    static get entityName() {
        return "note_embeddings";
    }
    static get primaryKeyName() {
        return "embedId";
    }
    static get hashedProperties() {
        return ["embedId", "noteId", "providerId", "modelId", "dimension", "version"];
    }

    embedId!: string;
    noteId!: string;
    providerId!: string;
    modelId!: string;
    dimension!: number;
    embedding!: Buffer;
    version!: number;

    constructor(row?: NoteEmbeddingRow) {
        super();

        if (row) {
            this.updateFromRow(row);
        }
    }

    updateFromRow(row: NoteEmbeddingRow): void {
        this.embedId = row.embedId;
        this.noteId = row.noteId;
        this.providerId = row.providerId;
        this.modelId = row.modelId;
        this.dimension = row.dimension;
        this.embedding = row.embedding;
        this.version = row.version;
        this.dateCreated = row.dateCreated;
        this.dateModified = row.dateModified;
        this.utcDateCreated = row.utcDateCreated;
        this.utcDateModified = row.utcDateModified;
    }

    beforeSaving() {
        super.beforeSaving();

        this.dateModified = dateUtils.localNowDateTime();
        this.utcDateModified = dateUtils.utcNowDateTime();
    }

    getPojo(): NoteEmbeddingRow {
        return {
            embedId: this.embedId,
            noteId: this.noteId,
            providerId: this.providerId,
            modelId: this.modelId,
            dimension: this.dimension,
            embedding: this.embedding,
            version: this.version,
            dateCreated: this.dateCreated!,
            dateModified: this.dateModified!,
            utcDateCreated: this.utcDateCreated,
            utcDateModified: this.utcDateModified!
        };
    }
}

export default BNoteEmbedding;
