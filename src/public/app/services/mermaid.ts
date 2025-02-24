let elkLoaded = false;

/**
 * Determines whether the ELK extension of Mermaid.js needs to be loaded (which is a relatively large library), based on the
 * front-matter of the diagram and loads the library if needed.
 *
 * <p>
 * If the library has already been loaded or the diagram does not require it, the method will exit immediately.
 *
 * @param mermaidContent the plain text of the mermaid diagram, potentially including a frontmatter.
 */
export async function loadElkIfNeeded(mermaidContent: string) {
    if (elkLoaded) {
        // Exit immediately since the ELK library is already loaded.
        return;
    }

    const parsedContent = await mermaid.parse(mermaidContent, {
        suppressErrors: true
    });
    if (parsedContent?.config?.layout === "elk") {
        elkLoaded = true;
        mermaid.registerLayoutLoaders((await import("@mermaid-js/layout-elk")).default);
    }
}
