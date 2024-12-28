export interface KeyboardShortcut {
    separator?: string;
    actionName?: string;
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
    actionName: string;
}
