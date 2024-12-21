
export interface FBlobRow {
    blobId: string;
    content: string;
    contentLength: number;
    dateModified: string;
    utcDateModified: string;
}

export default class FBlob {

    blobId: string;
    /**
     * can either contain the whole content (in e.g. string notes), only part (large text notes) or nothing at all (binary notes, images)
     */
    content: string;
    contentLength: number;
    dateModified: string;
    utcDateModified: string;

    constructor(row: FBlobRow) {
        this.blobId = row.blobId;
        this.content = row.content;
        this.contentLength = row.contentLength;
        this.dateModified = row.dateModified;
        this.utcDateModified = row.utcDateModified;
    }

    /**
     * @throws Error in case of invalid JSON
     */
    getJsonContent(): unknown {
        if (!this.content || !this.content.trim()) {
            return null;
        }

        return JSON.parse(this.content);
    }

    getJsonContentSafely(): unknown | null {
        try {
            return this.getJsonContent();
        }
        catch (e) {
            return null;
        }
    }
}
