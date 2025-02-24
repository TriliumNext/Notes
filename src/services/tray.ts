import { Menu, Tray } from "electron";
import path from "path";
import windowService from "./window.js";
import optionService from "./options.js";
import { fileURLToPath } from "url";
import type { KeyboardActionNames } from "./keyboard_actions_interface.js";
import date_notes from "./date_notes.js";
import type BNote from "../becca/entities/bnote.js";
import becca from "../becca/becca.js";
import becca_service from "../becca/becca_service.js";
import type BRecentNote from "../becca/entities/brecent_note.js";
import { ipcMain, nativeTheme } from "electron/main";
import { default as i18next, t } from "i18next";
import { isDev, isMac } from "./utils.js";
import cls from "./cls.js";

let tray: Tray;
// `mainWindow.isVisible` doesn't work with `mainWindow.show` and `mainWindow.hide` - it returns `false` when the window
// is minimized
let isVisible = true;

function getTrayIconPath() {
    let name: string;
    if (isMac) {
        name = "icon-blackTemplate";
    } else if (isDev) {
        name = "icon-purple";
    } else {
        name = "icon-color";
    }

    return path.join(path.dirname(fileURLToPath(import.meta.url)), "../..", "images", "app-icons", "tray", `${name}.png`);
}

function getIconPath(name: string) {
    const suffix = (!isMac && nativeTheme.shouldUseDarkColors ? "-inverted" : "");
    return path.join(path.dirname(fileURLToPath(import.meta.url)), "../..", "images", "app-icons", "tray", `${name}Template${suffix}.png`);
}

function registerVisibilityListener() {
    const mainWindow = windowService.getMainWindow();
    if (!mainWindow) {
        return;
    }

    // They need to be registered before the tray updater is registered
    mainWindow.on("show", () => {
        isVisible = true;
        updateTrayMenu();
    });
    mainWindow.on("hide", () => {
        isVisible = false;
        updateTrayMenu();
    });

    mainWindow.on("minimize", updateTrayMenu);
    mainWindow.on("maximize", updateTrayMenu);
    if (!isMac) {
        // macOS uses template icons which work great on dark & light themes.
        nativeTheme.on("updated", updateTrayMenu);
    }
    ipcMain.on("reload-tray", updateTrayMenu);
    i18next.on("languageChanged", updateTrayMenu);
}

function updateTrayMenu() {
    const mainWindow = windowService.getMainWindow();
    if (!mainWindow) {
        return;
    }

    function ensureVisible() {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    }

    function triggerKeyboardAction(actionName: KeyboardActionNames) {
        mainWindow?.webContents.send("globalShortcut", actionName);
        ensureVisible();
    }

    function openInSameTab(note: BNote | BRecentNote) {
        mainWindow?.webContents.send("openInSameTab", note.noteId);
        ensureVisible();
    }

    function buildBookmarksMenu() {
        const parentNote = becca.getNoteOrThrow("_lbBookmarks");
        const menuItems: Electron.MenuItemConstructorOptions[] = [];

        for (const bookmarkNote of parentNote?.children) {
            if (bookmarkNote.isLabelTruthy("bookmarkFolder")) {
                menuItems.push({
                    label: bookmarkNote.title,
                    type: "submenu",
                    submenu: bookmarkNote.children.map((subitem) => {
                        return {
                            label: subitem.title,
                            type: "normal",
                            click: () => openInSameTab(subitem)
                        };
                    })
                });
            } else {
                menuItems.push({
                    label: bookmarkNote.title,
                    type: "normal",
                    click: () => openInSameTab(bookmarkNote)
                });
            }

        }

        return menuItems;
    }

    function buildRecentNotesMenu() {
        const recentNotes = becca.getRecentNotesFromQuery(`
            SELECT recent_notes.*
            FROM recent_notes
            JOIN notes USING(noteId)
            WHERE notes.isDeleted = 0
            ORDER BY utcDateCreated DESC
            LIMIT 10
        `);
        const menuItems: Electron.MenuItemConstructorOptions[] = [];
        const formatter = new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "short"
        });

        for (const recentNote of recentNotes) {
            const date = new Date(recentNote.utcDateCreated);

            menuItems.push({
                label: becca_service.getNoteTitle(recentNote.noteId),
                type: "normal",
                sublabel: formatter.format(date),
                click: () => openInSameTab(recentNote)
            })
        }

        return menuItems;
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: t("tray.show-windows"),
            type: "checkbox",
            checked: isVisible,
            click: () => {
                if (isVisible) {
                    mainWindow.hide();
                } else {
                    ensureVisible();
                }
            }
        },
        { type: "separator" },
        {
            label: t("tray.new-note"),
            type: "normal",
            icon: getIconPath("new-note"),
            click: () => triggerKeyboardAction("createNoteIntoInbox")
        },
        {
            label: t("tray.today"),
            type: "normal",
            icon: getIconPath("today"),
            click: cls.wrap(() => openInSameTab(date_notes.getTodayNote()))
        },
        {
            label: t("tray.bookmarks"),
            type: "submenu",
            icon: getIconPath("bookmarks"),
            submenu: buildBookmarksMenu()
        },
        {
            label: t("tray.recents"),
            type: "submenu",
            icon: getIconPath("recents"),
            submenu: buildRecentNotesMenu()
        },
        { type: "separator" },
        {
            label: t("tray.close"),
            type: "normal",
            icon: getIconPath("close"),
            click: () => {
                mainWindow.close();
            }
        }
    ]);

    tray?.setContextMenu(contextMenu);
}

function changeVisibility() {
    const window = windowService.getMainWindow();
    if (!window) {
        return;
    }

    if (isVisible) {
        window.hide();
    } else {
        window.show();
        window.focus();
    }
}

function createTray() {
    if (optionService.getOptionBool("disableTray")) {
        return;
    }

    tray = new Tray(getTrayIconPath());
    tray.setToolTip(t("tray.tooltip"));
    // Restore focus
    tray.on("click", changeVisibility);
    updateTrayMenu();

    registerVisibilityListener();
}

export default {
    createTray
};
