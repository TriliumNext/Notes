/*
 * This file contains type definitions for libraries that did not have one
 * in its library or in `@types/*` packages.
 */

declare module 'unescape' {
    function unescape(str: string, type?: string): string;
    export default unescape;
}

declare module 'html2plaintext' {
    function html2plaintext(htmlText: string): string;
    export default html2plaintext;
}

declare module 'normalize-strings' {
    function normalizeString(string: string): string;
    export default normalizeString;
}

declare module 'joplin-turndown-plugin-gfm' {
    import TurndownService from "turndown";
    namespace gfm {
        function gfm(service: TurndownService): void;
    }
    export default gfm;
}

declare module 'is-animated' {
    function isAnimated(buffer: Buffer): boolean;
    export default isAnimated;
}