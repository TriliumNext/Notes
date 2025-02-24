"use strict";

/*
 * This file resolves trilium data path in this order of priority:
 * - case A) if TRILIUM_DATA_DIR environment variable exists, then its value is used as the path
 * - case B) if "trilium-data" dir exists directly in the home dir, then it is used
 * - case C) based on OS convention, if the "app data directory" exists, we'll use or create "trilium-data" directory there
 * - case D) as a fallback if the previous step fails, we'll use home dir
 */

import os from "os";
import fs from "fs";
import { join as pathJoin } from "path";

const DIR_NAME = "trilium-data";
const FOLDER_PERMISSIONS = 0o700;

export function getTriliumDataDir(dataDirName: string) {
    // case A
    if (process.env.TRILIUM_DATA_DIR) {
        createDirIfNotExisting(process.env.TRILIUM_DATA_DIR);
        return process.env.TRILIUM_DATA_DIR;
    }

    // case B
    const homePath = pathJoin(os.homedir(), dataDirName);
    if (fs.existsSync(homePath)) {
        return homePath;
    }

    // case C
    const platformAppDataDir = getPlatformAppDataDir(os.platform(), process.env.APPDATA);
    if (platformAppDataDir && fs.existsSync(platformAppDataDir)) {
        const appDataDirPath = pathJoin(platformAppDataDir, dataDirName);
        createDirIfNotExisting(appDataDirPath);
        return appDataDirPath;
    }

    // case D
    createDirIfNotExisting(homePath);
    return homePath;
}

export function getDataDirs(TRILIUM_DATA_DIR: string) {
    const dataDirs = {
        TRILIUM_DATA_DIR: TRILIUM_DATA_DIR,
        DOCUMENT_PATH: process.env.TRILIUM_DOCUMENT_PATH || pathJoin(TRILIUM_DATA_DIR, "document.db"),
        BACKUP_DIR: process.env.TRILIUM_BACKUP_DIR || pathJoin(TRILIUM_DATA_DIR, "backup"),
        LOG_DIR: process.env.TRILIUM_LOG_DIR || pathJoin(TRILIUM_DATA_DIR, "log"),
        ANONYMIZED_DB_DIR: process.env.TRILIUM_ANONYMIZED_DB_DIR || pathJoin(TRILIUM_DATA_DIR, "anonymized-db"),
        CONFIG_INI_PATH: process.env.TRILIUM_CONFIG_INI_PATH || pathJoin(TRILIUM_DATA_DIR, "config.ini")
    } as const;

    Object.freeze(dataDirs);
    return dataDirs;
}

export function getPlatformAppDataDir(platform: ReturnType<typeof os.platform>, ENV_APPDATA_DIR: string | undefined = process.env.APPDATA) {
    switch (true) {
        case platform === "win32" && !!ENV_APPDATA_DIR:
            return ENV_APPDATA_DIR;

        case platform === "linux":
            return `${os.homedir()}/.local/share`;

        case platform === "darwin":
            return `${os.homedir()}/Library/Application Support`;

        default:
            // if OS is not recognized
            return null;
    }
}

function createDirIfNotExisting(path: fs.PathLike, permissionMode: fs.Mode = FOLDER_PERMISSIONS) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, permissionMode);
    }
}

const TRILIUM_DATA_DIR = getTriliumDataDir(DIR_NAME);
const dataDirs = getDataDirs(TRILIUM_DATA_DIR);

export default dataDirs;
