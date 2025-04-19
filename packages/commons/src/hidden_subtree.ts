import { AttributeType } from "./rows.js";

type LauncherNoteType = "launcher" | "search" | "doc" | "noteMap" | "contentWidget" | "book" | "file" | "image" | "text" | "relationMap" | "render" | "canvas" | "mermaid" | "webView" | "code" | "mindMap" | "geoMap";

enum Command {
    jumpToNote,
    searchNotes,
    createNoteIntoInbox,
    showRecentChanges,
    showOptions,
    createAiChat
}

export interface HiddenSubtreeAttribute {
    type: AttributeType;
    name: string;
    isInheritable?: boolean;
    value?: string;
}

export interface HiddenSubtreeItem {
    notePosition?: number;
    id: string;
    title: string;
    type: LauncherNoteType;
    icon?: string;
    attributes?: HiddenSubtreeAttribute[];
    children?: HiddenSubtreeItem[];
    isExpanded?: boolean;
    baseSize?: string;
    growthFactor?: string;
    targetNoteId?: "_backendLog" | "_globalNoteMap";
    builtinWidget?:
        | "todayInJournal"
        | "bookmarks"
        | "spacer"
        | "backInHistoryButton"
        | "forwardInHistoryButton"
        | "syncStatus"
        | "protectedSession"
        | "calendar"
        | "quickSearch"
        | "aiChatLauncher";
    command?: keyof typeof Command;
}