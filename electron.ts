"use strict";

import electron from "electron";
import electronDebug from "electron-debug";
import electronDl from "electron-dl";
import sqlInit from "./src/services/sql_init.js";
import appIconService from "./src/services/app_icon.js";
import windowService from "./src/services/window.js";
import tray from "./src/services/tray.js";

import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

// Prevent Trilium starting twice on first install and on uninstall for the Windows installer.
if ((await import('electron-squirrel-startup')).default) {
  process.exit(0);
}

// Adds debug features like hotkeys for triggering dev tools and reload
electronDebug();

appIconService.installLocalAppIcon();

electronDl({ saveAs: true });

// needed for excalidraw export https://github.com/zadam/trilium/issues/4271
electron.app.commandLine.appendSwitch(
  "enable-experimental-web-platform-features"
);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});

electron.app.on("ready", async () => {
  //    electron.app.setAppUserModelId('com.github.zadam.trilium');

  // if db is not initialized -> setup process
  // if db is initialized, then we need to wait until the migration process is finished
  if (sqlInit.isDbInitialized()) {
    await sqlInit.dbReady;

    await windowService.createMainWindow(electron.app);

    if (process.platform === "darwin") {
      electron.app.on("activate", async () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) {
          await windowService.createMainWindow(electron.app);
        }
      });
    }

    tray.createTray();
  } else {
    await windowService.createSetupWindow();
  }

  await windowService.registerGlobalShortcuts();
});

electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});

// this is to disable electron warning spam in the dev console (local development only)
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

await import('./src/main.js');
