"use strict";

import optionService from "../../services/options.js";
import log from "../../services/log.js";
import searchService from "../../services/search/services/search.js";
import ValidationError from "../../errors/validation_error.js";
import { Request } from 'express';

// options allowed to be updated directly in the Options dialog
const ALLOWED_OPTIONS = new Set([
    'eraseEntitiesAfterTimeInSeconds',
    'protectedSessionTimeout',
    'revisionSnapshotTimeInterval',
    'zoomFactor',
    'theme',
    'syncServerHost',
    'syncServerTimeout',
    'syncProxy',
    'hoistedNoteId',
    'mainFontSize',
    'mainFontFamily',
    'treeFontSize',
    'treeFontFamily',
    'detailFontSize',
    'detailFontFamily',
    'monospaceFontSize',
    'monospaceFontFamily',
    'openNoteContexts',
    'vimKeymapEnabled',
    'codeLineWrapEnabled',
    'codeNotesMimeTypes',
    'spellCheckEnabled',
    'spellCheckLanguageCode',
    'imageMaxWidthHeight',
    'imageJpegQuality',
    'leftPaneWidth',
    'rightPaneWidth',
    'leftPaneVisible',
    'rightPaneVisible',
    'nativeTitleBarVisible',
    'headingStyle',
    'autoCollapseNoteTree',
    'autoReadonlySizeText',
    'autoReadonlySizeCode',
    'overrideThemeFonts',
    'dailyBackupEnabled',
    'weeklyBackupEnabled',
    'monthlyBackupEnabled',
    'maxContentWidth',
    'compressImages',
    'downloadImagesAutomatically',
    'minTocHeadings',
    'highlightsList',
    'checkForUpdates',
    'disableTray',
    'eraseUnusedAttachmentsAfterSeconds',
    'disableTray',
    'customSearchEngineName',
    'customSearchEngineUrl',
    'promotedAttributesOpenInRibbon',
    'editedNotesOpenInRibbon',
    'locale',
    'firstDayOfWeek'
]);

function getOptions() {
    const optionMap = optionService.getOptionMap();
    const resultMap: Record<string, string> = {};

    for (const optionName in optionMap) {
        if (isAllowed(optionName)) {
            resultMap[optionName] = optionMap[optionName];
        }
    }

    resultMap['isPasswordSet'] = optionMap['passwordVerificationHash'] ? 'true' : 'false';

    return resultMap;
}

function updateOption(req: Request) {
    const {name, value} = req.params;

    if (!update(name, value)) {
        throw new ValidationError("not allowed option to change");
    }
}

function updateOptions(req: Request) {
    for (const optionName in req.body) {
        if (!update(optionName, req.body[optionName])) {
            // this should be improved
            // it should return 400 instead of current 500, but at least it now rollbacks transaction
            throw new Error(`Option '${optionName}' is not allowed to be changed`);
        }
    }
}

function update(name: string, value: string) {
    if (!isAllowed(name)) {
        return false;
    }

    if (name !== 'openNoteContexts') {
        log.info(`Updating option '${name}' to '${value}'`);
    }

    optionService.setOption(name, value);

    return true;
}

function getUserThemes() {
    const notes = searchService.searchNotes("#appTheme", {ignoreHoistedNote: true});
    const ret = [];

    for (const note of notes) {
        let value = note.getOwnedLabelValue('appTheme');

        if (!value) {
            value = note.title.toLowerCase().replace(/[^a-z0-9]/gi, '-');
        }

        ret.push({
            val: value,
            title: note.title,
            noteId: note.noteId
        });
    }

    return ret;
}

function getSupportedLocales() {
    // TODO: Currently hardcoded, needs to read the list of available languages.
    return [
        {
            "id": "en",
            "name": "English"
        },
        {
            "id": "es",
            "name": "Español"
        },
        {
            "id": "cn",
            "name": "简体中文"
        },
        {
            "id": "ro",
            "name": "Română"
        }
    ];
}

function isAllowed(name: string) {
    return ALLOWED_OPTIONS.has(name)
        || name.startsWith("keyboardShortcuts")
        || name.endsWith("Collapsed")
        || name.startsWith("hideArchivedNotes");
}

export default {
    getOptions,
    updateOption,
    updateOptions,
    getUserThemes,
    getSupportedLocales
};
