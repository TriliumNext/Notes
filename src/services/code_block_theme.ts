/**
 * @module
 *
 * Manages the server-side functionality of the code blocks feature, mostly for obtaining the available themes for syntax highlighting.
 */

import fs from "fs";
import themeNames from "./code_block_theme_names.json" with { type: "json" };
import { t } from "i18next";
import { join } from "path";
import { isDev, isElectron, getResourceDir } from "./utils.js";

/**
 * Represents a color scheme for the code block syntax highlight.
 */
interface ColorTheme {
    /** The ID of the color scheme which should be stored in the options. */
    val: string;
    /** A user-friendly name of the theme. The name is already localized. */
    title: string;
}

/**
 * Returns all the supported syntax highlighting themes for code blocks, in groups.
 *
 * The return value is an object where the keys represent groups in their human-readable name (e.g. "Light theme")
 * and the values are an array containing the information about every theme. There is also a special group with no
 * title (empty string) which should be displayed at the top of the listing pages, without a group.
 *
 * @returns the supported themes, grouped.
 */
export function listSyntaxHighlightingThemes() {
    const path = join(getResourceDir(), getStylesDirectory());
    const systemThemes = readThemesFromFileSystem(path);

    return {
        "": [
            {
                val: "none",
                title: t("code_block.theme_none")
            }
        ],
        ...groupThemesByLightOrDark(systemThemes)
    };
}

function getStylesDirectory() {
    if (isElectron && !isDev) {
        return "styles";
    }

    return "node_modules/@highlightjs/cdn-assets/styles";
}

/**
 * Reads all the predefined themes by listing all minified CSSes from a given directory.
 *
 * The theme names are mapped against a known list in order to provide more descriptive names such as "Visual Studio 2015 (Dark)" instead of "vs2015".
 *
 * @param path the path to read from. Usually this is the highlight.js `styles` directory.
 * @returns the list of themes.
 */
function readThemesFromFileSystem(path: string): ColorTheme[] {
    return fs
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
}

/**
 * Groups a list of themes by dark or light themes. This is done simply by checking whether "Dark" is present in the given theme, otherwise it's considered a light theme.
 * This generally only works if the theme has a known human-readable name (see {@link #readThemesFromFileSystem()})
 *
 * @param listOfThemes the list of themes to be grouped.
 * @returns the grouped themes by light or dark.
 */
function groupThemesByLightOrDark(listOfThemes: ColorTheme[]) {
    const darkThemes = [];
    const lightThemes = [];

    for (const theme of listOfThemes) {
        if (theme.title.includes("Dark")) {
            darkThemes.push(theme);
        } else {
            lightThemes.push(theme);
        }
    }

    const output: Record<string, ColorTheme[]> = {};
    output[t("code_block.theme_group_light")] = lightThemes;
    output[t("code_block.theme_group_dark")] = darkThemes;
    return output;
}
