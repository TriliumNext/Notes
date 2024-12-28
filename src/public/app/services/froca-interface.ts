import FAttachment from "../entities/fattachment.js";
import FAttribute from "../entities/fattribute.js";
import FBlob from "../entities/fblob.js";
import FBranch from "../entities/fbranch.js";
import FNote from "../entities/fnote.js";

export interface Froca {
    notes: Record<string, FNote>;
    branches: Record<string, FBranch>;
    attributes: Record<string, FAttribute>;
    attachments: Record<string, FAttachment>;
    blobPromises: Record<string, Promise<void | FBlob> | null>;

    getBlob(entityType: string, entityId: string): Promise<void | FBlob | null>;
    getNote(noteId: string, silentNotFoundError?: boolean): Promise<FNote | null>;
    getNoteFromCache(noteId: string): FNote;
    getNotesFromCache(noteIds: string[], silentNotFoundError?: boolean): FNote[];
    getNotes(noteIds: string[], silentNotFoundError?: boolean): Promise<FNote[]>;

    getBranch(branchId: string, silentNotFoundError?: boolean): FBranch | undefined;
    getBranches(branchIds: string[], silentNotFoundError?: boolean): FBranch[];

    getAttachmentsForNote(noteId: string): Promise<FAttachment[]>;
}