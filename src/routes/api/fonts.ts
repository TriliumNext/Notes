import { Request, Response } from 'express';
import optionService from "../../services/options.js";
import { OptionMap } from '../../services/options_interface.js';

const SYSTEM_SANS_SERIF = [
    "system-ui",
    "-apple-system", "BlinkMacSystemFont",
    "Segoe UI",
    "Cantarell",
    "Ubuntu",
    "Noto Sans",
    "Helvetica",
    "Arial",
    "sans-serif",
    "Apple Color Emoji", "Segoe UI Emoji"
].join(",");

const SYSTEM_MONOSPACE = [
    "ui-monospace",
    "SFMono-Regular", "SF Mono",
    "Consolas",
    "Source Code Pro",
    "Ubuntu Mono",
    "Menlo",
    "Liberation Mono",
    "monospace"
].join(",");

function getFontCss(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/css');

    if (!optionService.getOptionBool('overrideThemeFonts')) {
        res.send('');

        return;
    }

    const optionsMap = optionService.getOptionMap();

    // using body to be more specific than themes' :root
    let style = 'body {';
    style += getFontFamily(optionsMap);
    style += getFontSize(optionsMap);
    style += '}';

    res.send(style);
}

function getFontFamily({ mainFontFamily, treeFontFamily, detailFontFamily, monospaceFontFamily }: OptionMap) {
    let style = "";

    // System override
    if (mainFontFamily === "system") {
        mainFontFamily = SYSTEM_SANS_SERIF;
    }

    if (treeFontFamily === "system") {
        treeFontFamily = SYSTEM_SANS_SERIF;
    }

    if (detailFontFamily === "system") {
        detailFontFamily = SYSTEM_SANS_SERIF;
    }

    if (monospaceFontFamily === "system") {
        monospaceFontFamily = SYSTEM_MONOSPACE;
    }

    // Apply the font override if not using theme fonts.
    if (mainFontFamily !== 'theme') {
        style += `--main-font-family: ${mainFontFamily};`;
    }

    if (treeFontFamily !== 'theme') {
        style += `--tree-font-family: ${treeFontFamily};`;
    }

    if (detailFontFamily !== 'theme') {
        style += `--detail-font-family: ${detailFontFamily};`;
    }

    if (monospaceFontFamily !== 'theme') {
        style += `--monospace-font-family: ${monospaceFontFamily};`;
    }

    return style;
}

function getFontSize(optionsMap: OptionMap) {
    let style = "";
    style += `--main-font-size: ${optionsMap.mainFontSize}%;`;
    style += `--tree-font-size: ${optionsMap.treeFontSize}%;`;
    style += `--detail-font-size: ${optionsMap.detailFontSize}%;`;
    style += `--monospace-font-size: ${optionsMap.monospaceFontSize}%;`;

    return style;
}

export default {
    getFontCss
};
