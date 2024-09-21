"use strict";

import sql from "../services/sql.js";
import attributeService from "../services/attributes.js";
import config from "../services/config.js";
import optionService from "../services/options.js";
import log from "../services/log.js";
import env from "../services/env.js";
import utils from "../services/utils.js";
import protectedSessionService from "../services/protected_session.js";
import packageJson from "../../package.json" with { type: "json" };
import assetPath from "../services/asset_path.js";
import appPath from "../services/app_path.js";
import { Request, Response } from 'express';

function index(req: Request, res: Response) {
    const options = optionService.getOptionMap();

    const view = (!utils.isElectron() && req.cookies['trilium-device'] === 'mobile')
        ? 'mobile'
        : 'desktop';

    const csrfToken = req.csrfToken();
    log.info(`Generated CSRF token ${csrfToken} with secret ${res.getHeader('set-cookie')}`);

    // We force the page to not be cached since on mobile the CSRF token can be
    // broken when closing the browser and coming back in to the page.
    // The page is restored from cache, but the API call fail.
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    res.render(view, {
        csrfToken: csrfToken,
        themeCssUrl: getThemeCssUrl(options.theme),
        headingStyle: options.headingStyle,
        mainFontSize: parseInt(options.mainFontSize),
        treeFontSize: parseInt(options.treeFontSize),
        detailFontSize: parseInt(options.detailFontSize),
        maxEntityChangeIdAtLoad: sql.getValue("SELECT COALESCE(MAX(id), 0) FROM entity_changes"),
        maxEntityChangeSyncIdAtLoad: sql.getValue("SELECT COALESCE(MAX(id), 0) FROM entity_changes WHERE isSynced = 1"),
        instanceName: config.General ? config.General.instanceName : null,
        appCssNoteIds: getAppCssNoteIds(),
        isDev: env.isDev(),
        isMainWindow: !req.query.extraWindow,
        isProtectedSessionAvailable: protectedSessionService.isProtectedSessionAvailable(),
        maxContentWidth: parseInt(options.maxContentWidth),
        triliumVersion: packageJson.version,
        assetPath: assetPath,
        appPath: appPath
    });
}

function getThemeCssUrl(theme: string) {
    if (theme === 'light') {
        return false; // light theme is always loaded as baseline
    } else if (theme === 'dark') {
        return `${assetPath}/stylesheets/theme-dark.css`;
    } else {
        const themeNote = attributeService.getNoteWithLabel('appTheme', theme);

        if (themeNote) {
            return `api/notes/download/${themeNote.noteId}`;
        } else {
            return false; // baseline light theme
        }
    }
}

function getAppCssNoteIds() {
    return attributeService.getNotesWithLabel('appCss').map(note => note.noteId);
}

export default {
    index
};
