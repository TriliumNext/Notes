"use strict";

import crypto from "crypto";
import { generator } from "rand-token";
import unescape from "unescape";
import escape from "escape-html";
import sanitize from "sanitize-filename";
import mimeTypes from "mime-types";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const randtoken = generator({ source: "crypto" });

export const isMac = process.platform === "darwin";

export const isWindows = process.platform === "win32";

export const isElectron = !!process.versions["electron"];

export const isDev = !!(process.env.TRILIUM_ENV && process.env.TRILIUM_ENV === "dev");

export function newEntityId() {
    return randomString(12);
}

export function randomString(length: number): string {
    return randtoken.generate(length);
}

export function randomSecureToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64");
}

export function md5(content: crypto.BinaryLike) {
    return crypto.createHash("md5").update(content).digest("hex");
}

export function hashedBlobId(content: string | Buffer) {
    if (content === null || content === undefined) {
        content = "";
    }

    // sha512 is faster than sha256
    const base64Hash = crypto.createHash("sha512").update(content).digest("base64");

    // we don't want such + and / in the IDs
    const kindaBase62Hash = base64Hash.replaceAll("+", "X").replaceAll("/", "Y");

    // 20 characters of base62 gives us ~120 bit of entropy which is plenty enough
    return kindaBase62Hash.substr(0, 20);
}

export function toBase64(plainText: string | Buffer) {
    return Buffer.from(plainText).toString("base64");
}

export function fromBase64(encodedText: string) {
    return Buffer.from(encodedText, "base64");
}

export function hmac(secret: any, value: any) {
    const hmac = crypto.createHmac("sha256", Buffer.from(secret.toString(), "ascii"));
    hmac.update(value.toString());
    return hmac.digest("base64");
}

export function hash(text: string) {
    text = text.normalize();

    return crypto.createHash("sha1").update(text).digest("base64");
}

export function isEmptyOrWhitespace(str: string) {
    return str === null || str.match(/^ *$/) !== null;
}

export function sanitizeSqlIdentifier(str: string) {
    return str.replace(/[^A-Za-z0-9_]/g, "");
}

export function escapeHtml(str: string) {
    return escape(str);
}

export function unescapeHtml(str: string) {
    return unescape(str);
}

export function toObject<T, K extends string | number | symbol, V>(array: T[], fn: (item: T) => [K, V]): Record<K, V> {
    const obj: Record<K, V> = {} as Record<K, V>; // TODO: unsafe?

    for (const item of array) {
        const ret = fn(item);

        obj[ret[0]] = ret[1];
    }

    return obj;
}

export function stripTags(text: string) {
    return text.replace(/<(?:.|\n)*?>/gm, "");
}

export function union<T extends string | number | symbol>(a: T[], b: T[]): T[] {
    const obj: Record<T, T> = {} as Record<T, T>; // TODO: unsafe?

    for (let i = a.length - 1; i >= 0; i--) {
        obj[a[i]] = a[i];
    }

    for (let i = b.length - 1; i >= 0; i--) {
        obj[b[i]] = b[i];
    }

    const res: T[] = [];

    for (const k in obj) {
        if (obj.hasOwnProperty(k)) {
            // <-- optional
            res.push(obj[k]);
        }
    }

    return res;
}

export function escapeRegExp(str: string) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export async function crash() {
    if (isElectron) {
        (await import("electron")).app.exit(1);
    } else {
        process.exit(1);
    }
}

export function sanitizeFilenameForHeader(filename: string) {
    let sanitizedFilename = sanitize(filename);

    if (sanitizedFilename.trim().length === 0) {
        sanitizedFilename = "file";
    }

    return encodeURIComponent(sanitizedFilename);
}

export function getContentDisposition(filename: string) {
    const sanitizedFilename = sanitizeFilenameForHeader(filename);

    return `file; filename="${sanitizedFilename}"; filename*=UTF-8''${sanitizedFilename}`;
}

const STRING_MIME_TYPES = new Set(["application/javascript", "application/x-javascript", "application/json", "application/x-sql", "image/svg+xml"]);

export function isStringNote(type: string | undefined, mime: string) {
    // render and book are string note in the sense that they are expected to contain empty string
    return (type && ["text", "code", "relationMap", "search", "render", "book", "mermaid", "canvas"].includes(type)) || mime.startsWith("text/") || STRING_MIME_TYPES.has(mime);
}

export function quoteRegex(url: string) {
    return url.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

export function replaceAll(string: string, replaceWhat: string, replaceWith: string) {
    const quotedReplaceWhat = quoteRegex(replaceWhat);

    return string.replace(new RegExp(quotedReplaceWhat, "g"), replaceWith);
}

export function formatDownloadTitle(fileName: string, type: string | null, mime: string) {
    const fileNameBase = !fileName ? "untitled" : sanitize(fileName);

    const getExtension = () => {
        if (type === "text") return ".html";
        if (type === "relationMap" || type === "canvas" || type === "search") return ".json";
        if (!mime) return "";

        const mimeLc = mime.toLowerCase();

        // better to just return the current name without a fake extension
        // it's possible that the title still preserves the correct extension anyways
        if (mimeLc === "application/octet-stream") return "";

        // if fileName has an extension matching the mime already - reuse it
        const mimeTypeFromFileName = mimeTypes.lookup(fileName);
        if (mimeTypeFromFileName === mimeLc) return "";

        // as last resort try to get extension from mimeType
        const extensions = mimeTypes.extension(mime);
        return extensions ? `.${extensions}` : "";
    };

    return `${fileNameBase}${getExtension()}`;
}

export function removeTextFileExtension(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
        case ".md":
        case ".markdown":
        case ".html":
        case ".htm":
            return filePath.substring(0, filePath.length - extension.length);
        default:
            return filePath;
    }
}

export function getNoteTitle(filePath: string, replaceUnderscoresWithSpaces: boolean, noteMeta?: { title?: string }) {
    if (noteMeta?.title) {
        return noteMeta.title;
    } else {
        const basename = path.basename(removeTextFileExtension(filePath));
        if (replaceUnderscoresWithSpaces) {
            return basename.replace(/_/g, " ").trim();
        }
        return basename;
    }
}

export function timeLimit<T>(promise: Promise<T>, limitMs: number, errorMessage?: string): Promise<T> {
    if (!promise || !promise.then) {
        // it's not actually a promise
        return promise;
    }

    // better stack trace if created outside of promise
    const error = new Error(errorMessage || `Process exceeded time limit ${limitMs}`);

    return new Promise((res, rej) => {
        let resolved = false;

        promise
            .then((result) => {
                resolved = true;

                res(result);
            })
            .catch((error) => rej(error));

        setTimeout(() => {
            if (!resolved) {
                rej(error);
            }
        }, limitMs);
    });
}

interface DeferredPromise<T> extends Promise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

export function deferred<T>(): DeferredPromise<T> {
    return (() => {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: any) => void;

        let promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        }) as DeferredPromise<T>;

        promise.resolve = resolve;
        promise.reject = reject;
        return promise as DeferredPromise<T>;
    })();
}

export function removeDiacritic(str: string) {
    if (!str) {
        return "";
    }
    str = str.toString();
    return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function normalize(str: string) {
    return removeDiacritic(str).toLowerCase();
}

export function toMap<T extends Record<string, any>>(list: T[], key: keyof T): Record<string, T> {
    const map: Record<string, T> = {};

    for (const el of list) {
        map[el[key]] = el;
    }

    return map;
}

export function isString(x: any) {
    return Object.prototype.toString.call(x) === "[object String]";
}

// try to turn 'true' and 'false' strings from process.env variables into boolean values or undefined
export function envToBoolean(val: string | undefined) {
    if (val === undefined || typeof val !== "string") return undefined;

    const valLc = val.toLowerCase().trim();

    if (valLc === "true") return true;
    if (valLc === "false") return false;

    return undefined;
}

/**
 * Returns the directory for resources. On Electron builds this corresponds to the `resources` subdirectory inside the distributable package.
 * On development builds, this simply refers to the root directory of the application.
 *
 * @returns the resource dir.
 */
export function getResourceDir() {
    if (isElectron && !isDev) {
        return process.resourcesPath;
    } else {
        return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    }
}

export default {
    randomSecureToken,
    randomString,
    md5,
    newEntityId,
    toBase64,
    fromBase64,
    hmac,
    isElectron,
    hash,
    isEmptyOrWhitespace,
    sanitizeSqlIdentifier,
    escapeHtml,
    unescapeHtml,
    toObject,
    stripTags,
    union,
    escapeRegExp,
    crash,
    getContentDisposition,
    isStringNote,
    quoteRegex,
    replaceAll,
    getNoteTitle,
    removeTextFileExtension,
    formatDownloadTitle,
    timeLimit,
    deferred,
    removeDiacritic,
    normalize,
    hashedBlobId,
    toMap,
    isString,
    getResourceDir,
    isMac,
    isWindows,
    envToBoolean
};
