import path from "path";
import url from "url";
import port from "./port.js";
import optionService from "./options.js";
import env from "./env.js";
import log from "./log.js";
import sqlInit from "./sql_init.js";
import cls from "./cls.js";
import keyboardActionsService from "./keyboard_actions.js";
import remoteMain from "@electron/remote/main/index.js";
import { App, BrowserWindow, WebContents, ipcMain } from 'electron';

import { fileURLToPath } from "url";
import { dirname } from "path";

// Prevent the window being garbage collected
let mainWindow: BrowserWindow | null;
let setupWindow: BrowserWindow | null;

async function createExtraWindow(extraWindowHash: string) {
    const spellcheckEnabled = optionService.getOptionBool('spellCheckEnabled');

    const { BrowserWindow } = await import('electron');

    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        title: 'TriliumNext Notes',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: spellcheckEnabled
        },
        frame: optionService.getOptionBool('nativeTitleBarVisible'),
        icon: getIcon()
    });

    win.setMenuBarVisibility(false);
    win.loadURL(`http://127.0.0.1:${port}/?extraWindow=1${extraWindowHash}`);

    configureWebContents(win.webContents, spellcheckEnabled);
}

ipcMain.on('create-extra-window', (event, arg) => {
    createExtraWindow(arg.extraWindowHash);
});

async function createMainWindow(app: App) {
    if ("setUserTasks" in app) {
        app.setUserTasks([
            {
                program: process.execPath,
                arguments: '--new-window',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'Open New Window',
                description: 'Open new window'
            }
        ]);
    }
    
    const windowStateKeeper = (await import('electron-window-state')).default; // should not be statically imported

    const mainWindowState = windowStateKeeper({
        // default window width & height, so it's usable on a 1600 * 900 display (including some extra panels etc.)
        defaultWidth: 1200,
        defaultHeight: 800
    });

    const spellcheckEnabled = optionService.getOptionBool('spellCheckEnabled');

    const { BrowserWindow } = (await import('electron')); // should not be statically imported

    mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        title: 'TriliumNext Notes',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: spellcheckEnabled,
            webviewTag: true
        },
        frame: optionService.getOptionBool('nativeTitleBarVisible'),
        icon: getIcon()
    });

    mainWindowState.manage(mainWindow);

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
    mainWindow.on('closed', () => mainWindow = null);

    configureWebContents(mainWindow.webContents, spellcheckEnabled);

    app.on('second-instance', (event, commandLine) => {
        if (commandLine.includes('--new-window')) {
            createExtraWindow("");  
        } else if (mainWindow) {
            // Someone tried to run a second instance, we should focus our window.
            // see www.ts "requestSingleInstanceLock" for the rest of this logic with explanation
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            mainWindow.focus();
        }
    });
}

function configureWebContents(webContents: WebContents, spellcheckEnabled: boolean) {
    if (!mainWindow) {
        return;
    }

    remoteMain.enable(webContents);

    mainWindow.webContents.setWindowOpenHandler((details) => {
        async function openExternal() {
            (await import('electron')).shell.openExternal(details.url);
        }
        
        openExternal();
        return { action: 'deny' }
    });

    // prevent drag & drop to navigate away from trilium
    webContents.on('will-navigate', (ev, targetUrl) => {
        const parsedUrl = url.parse(targetUrl);

        // we still need to allow internal redirects from setup and migration pages
        if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname || "") || (parsedUrl.path && parsedUrl.path !== '/' && parsedUrl.path !== '/?')) {
            ev.preventDefault();
        }
    });

    if (spellcheckEnabled) {
        const languageCodes = (optionService.getOption('spellCheckLanguageCode'))
            .split(',')
            .map(code => code.trim());

        webContents.session.setSpellCheckerLanguages(languageCodes);
    }
}

function getIcon() {
    return path.join(dirname(fileURLToPath(import.meta.url)), '../../images/app-icons/png/256x256' + (env.isDev() ? '-dev' : '') + '.png');
}

async function createSetupWindow() {
    const { BrowserWindow } = await import("electron"); // should not be statically imported
    setupWindow = new BrowserWindow({
        width: 800,
        height: 800,
        title: 'TriliumNext Notes Setup',
        icon: getIcon(),
        webPreferences: {
            // necessary for e.g. utils.isElectron()
            nodeIntegration: true
        }
    });

    setupWindow.setMenuBarVisibility(false);
    setupWindow.loadURL(`http://127.0.0.1:${port}`);
    setupWindow.on('closed', () => setupWindow = null);
}

function closeSetupWindow() {
    if (setupWindow) {
        setupWindow.close();
    }
}

async function registerGlobalShortcuts() {
    const { globalShortcut } = await import("electron");

    await sqlInit.dbReady;

    const allActions = keyboardActionsService.getKeyboardActions();

    for (const action of allActions) {
        if (!action.effectiveShortcuts) {
            continue;
        }

        for (const shortcut of action.effectiveShortcuts) {
            if (shortcut.startsWith('global:')) {
                const translatedShortcut = shortcut.substr(7);

                const result = globalShortcut.register(translatedShortcut, cls.wrap(() => {
                    if (!mainWindow) {
                        return;
                    }

                    // window may be hidden / not in focus
                    mainWindow.focus();

                    mainWindow.webContents.send('globalShortcut', action.actionName);
                }));

                if (result) {
                    log.info(`Registered global shortcut ${translatedShortcut} for action ${action.actionName}`);
                }
                else {
                    log.info(`Could not register global shortcut ${translatedShortcut}`);
                }
            }
        }
    }
}

function getMainWindow() {
    return mainWindow;
}

export default {
    createMainWindow,
    createSetupWindow,
    closeSetupWindow,
    registerGlobalShortcuts,
    getMainWindow
};
