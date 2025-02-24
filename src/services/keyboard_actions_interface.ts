const enum KeyboardActionNamesEnum {
    backInNoteHistory,
    forwardInNoteHistory,
    jumpToNote,
    scrollToActiveNote,
    quickSearch,
    searchInSubtree,
    expandSubtree,
    collapseTree,
    collapseSubtree,
    sortChildNotes,
    createNoteAfter,
    createNoteInto,
    createNoteIntoInbox,
    deleteNotes,
    moveNoteUp,
    moveNoteDown,
    moveNoteUpInHierarchy,
    moveNoteDownInHierarchy,
    editNoteTitle,
    editBranchPrefix,
    cloneNotesTo,
    moveNotesTo,
    copyNotesToClipboard,
    pasteNotesFromClipboard,
    cutNotesToClipboard,
    selectAllNotesInParent,
    addNoteAboveToSelection,
    addNoteBelowToSelection,
    duplicateSubtree,
    openNewTab,
    closeActiveTab,
    reopenLastTab,
    activateNextTab,
    activatePreviousTab,
    openNewWindow,
    toggleTray,
    toggleZenMode,
    firstTab,
    secondTab,
    thirdTab,
    fourthTab,
    fifthTab,
    sixthTab,
    seventhTab,
    eigthTab,
    ninthTab,
    lastTab,
    showNoteSource,
    showOptions,
    showRevisions,
    showRecentChanges,
    showSQLConsole,
    showBackendLog,
    showCheatsheet,
    showHelp,
    addLinkToText,
    followLinkUnderCursor,
    insertDateTimeToText,
    pasteMarkdownIntoText,
    cutIntoNote,
    addIncludeNoteToText,
    editReadOnlyNote,
    addNewLabel,
    addNewRelation,
    toggleRibbonTabClassicEditor,
    toggleRibbonTabBasicProperties,
    toggleRibbonTabBookProperties,
    toggleRibbonTabFileProperties,
    toggleRibbonTabImageProperties,
    toggleRibbonTabOwnedAttributes,
    toggleRibbonTabInheritedAttributes,
    toggleRibbonTabPromotedAttributes,
    toggleRibbonTabNoteMap,
    toggleRibbonTabNoteInfo,
    toggleRibbonTabNotePaths,
    toggleRibbonTabSimilarNotes,
    toggleRightPane,
    printActiveNote,
    exportAsPdf,
    openNoteExternally,
    renderActiveNote,
    runActiveNote,
    toggleNoteHoisting,
    unhoist,
    reloadFrontendApp,
    openDevTools,
    findInText,
    toggleLeftPane,
    toggleFullscreen,
    zoomOut,
    zoomIn,
    zoomReset,
    copyWithoutFormatting,
    forceSaveRevision
}

export type KeyboardActionNames = keyof typeof KeyboardActionNamesEnum;

export interface KeyboardShortcut {
    separator?: string;
    actionName?: KeyboardActionNames;
    description?: string;
    defaultShortcuts?: string[];
    effectiveShortcuts?: string[];
    /**
     * Scope here means on which element the keyboard shortcuts are attached - this means that for the shortcut to work,
     * the focus has to be inside the element.
     *
     * So e.g. shortcuts with "note-tree" scope work only when the focus is in note tree.
     * This allows to have the same shortcut have different actions attached based on the context
     * e.g. CTRL-C in note tree does something a bit different from CTRL-C in the text editor.
     */
    scope?: "window" | "note-tree" | "text-detail" | "code-detail";
}

export interface KeyboardShortcutWithRequiredActionName extends KeyboardShortcut {
    actionName: KeyboardActionNames;
}
