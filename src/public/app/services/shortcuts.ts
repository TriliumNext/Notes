import utils from "./utils.js";

type ElementType = HTMLElement | Document;
type Handler = (e: JQuery.TriggeredEvent<ElementType, string, ElementType, ElementType>) => void;

function removeGlobalShortcut(namespace: string) {
    bindGlobalShortcut("", null, namespace);
}

function bindGlobalShortcut(keyboardShortcut: string, handler: Handler | null, namespace: string | null = null) {
    bindElShortcut($(document), keyboardShortcut, handler, namespace);
}

function bindElShortcut($el: JQuery<ElementType>, keyboardShortcut: string, handler: Handler | null, namespace: string | null = null) {
    if (utils.isDesktop()) {
        keyboardShortcut = normalizeShortcut(keyboardShortcut);

        let eventName = "keydown";

        if (namespace) {
            eventName += `.${namespace}`;

            // if there's a namespace, then we replace the existing event handler with the new one
            $el.off(eventName);
        }

        // method can be called to remove the shortcut (e.g. when keyboardShortcut label is deleted)
        if (keyboardShortcut) {
            $el.bind(eventName, keyboardShortcut, (e) => {
                if (handler) {
                    handler(e);
                }

                e.preventDefault();
                e.stopPropagation();
            });
        }
    }
}

/**
 * Normalize to the form expected by the jquery.hotkeys.js
 */
function normalizeShortcut(shortcut: string): string {
    if (!shortcut) {
        return shortcut;
    }

    return shortcut.toLowerCase().replace("enter", "return").replace("delete", "del").replace("ctrl+alt", "alt+ctrl").replace("meta+alt", "alt+meta"); // alt needs to be first;
}

export default {
    bindGlobalShortcut,
    bindElShortcut,
    removeGlobalShortcut,
    normalizeShortcut
};
