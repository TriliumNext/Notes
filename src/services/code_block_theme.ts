import fs from "fs";
import themeNames from "./code_block_theme_names.json" assert { type: "json" }

export function listSyntaxHighlightingThemes() {
    const path = "node_modules/@highlightjs/cdn-assets/styles";
    const allThemes = fs
        .readdirSync(path)
        .filter((el) => el.endsWith(".min.css"))
        .map((name) => {
            const nameWithoutExtension = name.replace(".min.css", "");            
            let title = nameWithoutExtension.replace(/-/g, " ");

            if (title in themeNames) {
                title = (themeNames as Record<string, string>)[title];
            }
            
            return {
                val: `default:${nameWithoutExtension}`,
                title: title
            };
        });
    return allThemes;
}