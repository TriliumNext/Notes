import type { KeyboardActionNames } from "./keyboard_actions_interface.js";

/**
 * A dictionary where the keys are the option keys (e.g. `theme`) and their corresponding values.
 */
export type OptionMap = Record<OptionNames, string>;

/**
 * For each keyboard action, there is a corresponding option which identifies the key combination defined by the user.
 */
type KeyboardShortcutsOptions<T extends KeyboardActionNames> = {
    [key in T as `keyboardShortcuts${Capitalize<key>}`]: string;
};

export type FontFamily = "theme" | "serif" | "sans-serif" | "monospace" | string;

export interface OptionDefinitions extends KeyboardShortcutsOptions<KeyboardActionNames> {
    openNoteContexts: string;
    lastDailyBackupDate: string;
    lastWeeklyBackupDate: string;
    lastMonthlyBackupDate: string;
    dbVersion: string;
    theme: string;
    syncServerHost: string;
    syncServerTimeout: string;
    syncProxy: string;
    mainFontFamily: FontFamily;
    treeFontFamily: FontFamily;
    detailFontFamily: FontFamily;
    monospaceFontFamily: FontFamily;
    spellCheckLanguageCode: string;
    codeNotesMimeTypes: string;
    headingStyle: string;
    highlightsList: string;
    customSearchEngineName: string;
    customSearchEngineUrl: string;
    locale: string;
    formattingLocale: string;
    codeBlockTheme: string;
    textNoteEditorType: string;
    layoutOrientation: string;
    allowedHtmlTags: string;
    documentId: string;
    documentSecret: string;
    passwordVerificationHash: string;
    passwordVerificationSalt: string;
    passwordDerivedKeySalt: string;
    encryptedDataKey: string;
    hoistedNoteId: string;

    // Multi-Factor Authentication
    mfaEnabled: boolean;
    mfaMethod: string;
    totpEncryptionSalt: string;
    totpEncryptedSecret: string;
    totpVerificationHash: string;
    encryptedRecoveryCodes: boolean;
    userSubjectIdentifierSaved: boolean;
    recoveryCodeInitialVector: string;
    recoveryCodeSecurityKey: string;
    recoveryCodesEncrypted: string;

    lastSyncedPull: number;
    lastSyncedPush: number;
    revisionSnapshotTimeInterval: number;
    revisionSnapshotTimeIntervalTimeScale: number;
    revisionSnapshotNumberLimit: number;
    protectedSessionTimeout: number;
    protectedSessionTimeoutTimeScale: number;
    zoomFactor: number;
    mainFontSize: number;
    treeFontSize: number;
    detailFontSize: number;
    monospaceFontSize: number;
    imageMaxWidthHeight: number;
    imageJpegQuality: number;
    leftPaneWidth: number;
    rightPaneWidth: number;
    eraseEntitiesAfterTimeInSeconds: number;
    eraseEntitiesAfterTimeScale: number;
    autoReadonlySizeText: number;
    autoReadonlySizeCode: number;
    maxContentWidth: number;
    minTocHeadings: number;
    eraseUnusedAttachmentsAfterSeconds: number;
    eraseUnusedAttachmentsAfterTimeScale: number;
    firstDayOfWeek: number;
    firstWeekOfYear: number;
    minDaysInFirstWeek: number;
    languages: string;

    // Appearance
    splitEditorOrientation: "horziontal" | "vertical";

    initialized: boolean;
    isPasswordSet: boolean;
    overrideThemeFonts: boolean;
    spellCheckEnabled: boolean;
    autoFixConsistencyIssues: boolean;
    vimKeymapEnabled: boolean;
    codeLineWrapEnabled: boolean;
    leftPaneVisible: boolean;
    rightPaneVisible: boolean;
    nativeTitleBarVisible: boolean;
    hideArchivedNotes_main: boolean;
    debugModeEnabled: boolean;
    autoCollapseNoteTree: boolean;
    dailyBackupEnabled: boolean;
    weeklyBackupEnabled: boolean;
    monthlyBackupEnabled: boolean;
    compressImages: boolean;
    downloadImagesAutomatically: boolean;
    checkForUpdates: boolean;
    disableTray: boolean;
    promotedAttributesOpenInRibbon: boolean;
    editedNotesOpenInRibbon: boolean;
    codeBlockWordWrap: boolean;
    textNoteEditorMultilineToolbar: boolean;
    backgroundEffects: boolean;

    // Share settings
    redirectBareDomain: boolean;
    showLoginInShareTheme: boolean;

    // AI/LLM integration options
    aiEnabled: boolean;
    aiProvider: string;
    aiSystemPrompt: string;
    aiTemperature: string;
    openaiApiKey: string;
    openaiDefaultModel: string;
    openaiEmbeddingModel: string;
    openaiBaseUrl: string;
    anthropicApiKey: string;
    anthropicDefaultModel: string;
    voyageEmbeddingModel: string;
    voyageApiKey: string;
    anthropicBaseUrl: string;
    ollamaEnabled: boolean;
    ollamaBaseUrl: string;
    ollamaDefaultModel: string;
    ollamaEmbeddingModel: string;
    codeOpenAiModel: string;
    aiProviderPrecedence: string;

    // Embedding-related options
    embeddingAutoUpdateEnabled: boolean;
    embeddingUpdateInterval: number;
    embeddingBatchSize: number;
    embeddingDefaultDimension: number;
    embeddingsDefaultProvider: string;
    embeddingProviderPrecedence: string;
    enableAutomaticIndexing: boolean;
    embeddingGenerationLocation: string;
    embeddingDimensionStrategy: string;
    embeddingSimilarityThreshold: number;
    maxNotesPerLlmQuery: number;
}

export type OptionNames = keyof OptionDefinitions;

export type FilterOptionsByType<U> = {
    [K in keyof OptionDefinitions]: OptionDefinitions[K] extends U ? K : never;
}[keyof OptionDefinitions];
