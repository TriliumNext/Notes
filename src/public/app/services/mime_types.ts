import { MIME_TYPE_AUTO, MIME_TYPES_DICT, normalizeMimeTypeForCKEditor, type MimeTypeDefinition } from "./mime_type_definitions.js";
import options from "./options.js";

interface MimeType extends MimeTypeDefinition {
    /**
     * True if this mime type was enabled by the user in the "Available MIME types in the dropdown" option in the Code Notes settings.
     */
    enabled: boolean;
}

let mimeTypes: MimeType[] | null = null;

function loadMimeTypes() {
    mimeTypes = JSON.parse(JSON.stringify(MIME_TYPES_DICT)) as MimeType[]; // clone

    const enabledMimeTypes = options.getJson("codeNotesMimeTypes") || MIME_TYPES_DICT.filter((mt) => mt.default).map((mt) => mt.mime);

    for (const mt of mimeTypes) {
        mt.enabled = enabledMimeTypes.includes(mt.mime) || mt.mime === "text/plain"; // text/plain is always enabled
    }
}

function getMimeTypes(): MimeType[] {
    if (mimeTypes === null) {
        loadMimeTypes();
    }

    return mimeTypes as MimeType[];
}

let mimeToHighlightJsMapping: Record<string, string> | null = null;

/**
 * Obtains the corresponding language tag for highlight.js for a given MIME type.
 *
 * The mapping is built the first time this method is built and then the results are cached for better performance.
 *
 * @param mimeType The MIME type of the code block, in the CKEditor-normalized format (e.g. `text-c-src` instead of `text/c-src`).
 * @returns the corresponding highlight.js tag, for example `c` for `text-c-src`.
 */
function getHighlightJsNameForMime(mimeType: string) {
    if (!mimeToHighlightJsMapping) {
        const mimeTypes = getMimeTypes();
        mimeToHighlightJsMapping = {};
        for (const mimeType of mimeTypes) {
            // The mime stored by CKEditor is text-x-csrc instead of text/x-csrc so we keep this format for faster lookup.
            const normalizedMime = normalizeMimeTypeForCKEditor(mimeType.mime);
            if (mimeType.highlightJs) {
                mimeToHighlightJsMapping[normalizedMime] = mimeType.highlightJs;
            }
        }
    }

    return mimeToHighlightJsMapping[mimeType];
}

export default {
    MIME_TYPE_AUTO,
    getMimeTypes,
    loadMimeTypes,
    getHighlightJsNameForMime
};
