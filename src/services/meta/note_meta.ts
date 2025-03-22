import type { NoteType } from "../../becca/entities/rows.js";
import type AttachmentMeta from "./attachment_meta.js";
import type AttributeMeta from "./attribute_meta.js";

export interface NoteMetaFile {
    formatVersion: number;
    appVersion: string;
    files: NoteMeta[];
}

export default interface NoteMeta {
    noteId?: string;
    notePath?: string[];
    isClone?: boolean;
    title?: string;
    notePosition?: number;
    prefix?: string | null;
    isExpanded?: boolean;
    type?: NoteType;
    mime?: string;
    /** 'html' or 'markdown', applicable to text notes only */
    format?: "html" | "markdown";
    dataFileName?: string;
    dirFileName?: string;
    /** this file should not be imported (e.g., HTML navigation) */
    noImport?: boolean;
    isImportRoot?: boolean;
    attributes?: AttributeMeta[];
    attachments?: AttachmentMeta[];
    children?: NoteMeta[];
}
