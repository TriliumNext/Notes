import library_loader from "./library_loader.js";
import mime_types from "./mime_types.js";
import options from "./options.js";

export function getStylesheetUrl(theme: string) {
    if (!theme) {
        return null;
    }

    const defaultPrefix = "default:";
    if (theme.startsWith(defaultPrefix)) {        
        return `${window.glob.assetPath}/node_modules/@highlightjs/cdn-assets/styles/${theme.substr(defaultPrefix.length)}.min.css`;
    }

    return null;
}

/**
 * Identifies all the code blocks (as `pre code`) under the specified hierarchy and uses the highlight.js library to obtain the highlighted text which is then applied on to the code blocks.
 * 
 * @param $container the container under which to look for code blocks and to apply syntax highlighting to them.
 */
export async function applySyntaxHighlight($container: JQuery<HTMLElement>) {
    if (!isSyntaxHighlightEnabled()) {
        return;
    }    

    const codeBlocks = $container.find("pre code");
    for (const codeBlock of codeBlocks) {
        const normalizedMimeType = extractLanguageFromClassList(codeBlock);
        if (!normalizedMimeType) {
            continue;
        }
        
        applySingleBlockSyntaxHighlight($(codeBlock), normalizedMimeType);
    }
}

/**
 * Applies syntax highlight to the given code block (assumed to be <pre><code>), using highlight.js.
 */
export async function applySingleBlockSyntaxHighlight($codeBlock: JQuery<HTMLElement>, normalizedMimeType: string) {
    $codeBlock.parent().toggleClass("hljs");
    const text = $codeBlock.text();

    if (!window.hljs) {
        await library_loader.requireLibrary(library_loader.HIGHLIGHT_JS);
    }

    let highlightedText = null;
    if (normalizedMimeType === mime_types.MIME_TYPE_AUTO) {
        highlightedText = hljs.highlightAuto(text);
    } else if (normalizedMimeType) {
        const language = mime_types.getHighlightJsNameForMime(normalizedMimeType);
        if (language) {
            highlightedText = hljs.highlight(text, { language });
        } else {
            console.warn(`Unknown mime type: ${normalizedMimeType}.`);
        }
    }
    
    if (highlightedText) {            
        $codeBlock.html(highlightedText.value);
    }
}

/**
 * Indicates whether syntax highlighting should be enabled for code blocks, by querying the value of the `codeblockTheme` option.
 * @returns whether syntax highlighting should be enabled for code blocks.
 */
export function isSyntaxHighlightEnabled() {
    const theme = options.get("codeBlockTheme");
    return theme && theme !== "none";
}

/**
 * Given a HTML element, tries to extract the `language-` class name out of it.
 * 
 * @param el the HTML element from which to extract the language tag.
 * @returns the normalized MIME type (e.g. `text-css` instead of `language-text-css`).
 */
function extractLanguageFromClassList(el: HTMLElement) {
    const prefix = "language-";
    for (const className of el.classList) {
        if (className.startsWith(prefix)) {
            return className.substring(prefix.length);
        }
    }

    return null;
}