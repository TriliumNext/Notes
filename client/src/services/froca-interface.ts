import FAttachment from "../entities/fattachment";
import FAttribute from "../entities/fattribute";
import FBlob from "../entities/fblob";
import FBranch from "../entities/fbranch";
import FNote from "../entities/fnote";

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