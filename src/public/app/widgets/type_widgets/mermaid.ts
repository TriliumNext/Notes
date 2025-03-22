import type { MermaidConfig } from "mermaid";
import { loadElkIfNeeded, postprocessMermaidSvg } from "../../services/mermaid.js";
import AbstractSvgSplitTypeWidget from "./abstract_svg_split_type_widget.js";

let idCounter = 1;
let registeredErrorReporter = false;

export class MermaidTypeWidget extends AbstractSvgSplitTypeWidget {

    static getType() {
        return "mermaid";
    }

    get attachmentName(): string {
        return "mermaid-export";
    }

    async renderSvg(content: string) {
        const mermaid = (await import("mermaid")).default;
        await loadElkIfNeeded(mermaid, content);
        if (!registeredErrorReporter) {
            // (await import("./linters/mermaid.js")).default();
            registeredErrorReporter = true;
        }

        mermaid.initialize({
            startOnLoad: false,
            ...(getMermaidConfig() as any),
        });

        idCounter++;
        const { svg } = await mermaid.render(`mermaid-graph-${idCounter}`, content);
        return postprocessMermaidSvg(svg);
    }

}


export function getMermaidConfig(): MermaidConfig {
    const documentStyle = window.getComputedStyle(document.documentElement);
    const mermaidTheme = documentStyle.getPropertyValue("--mermaid-theme") as "default";

    return {
        theme: mermaidTheme.trim() as "default",
        securityLevel: "antiscript",
        flowchart: { useMaxWidth: false },
        sequence: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
        class: { useMaxWidth: false },
        state: { useMaxWidth: false },
        pie: { useMaxWidth: true },
        journey: { useMaxWidth: false },
        gitGraph: { useMaxWidth: false }
    };
}
