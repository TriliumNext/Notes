import log from "./log.js";
import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";
export const RESOURCE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// where the "trilium" executable is
const ELECTRON_APP_ROOT_DIR = path.resolve(RESOURCE_DIR, "../..");
const DB_INIT_DIR = path.resolve(RESOURCE_DIR, "db");

if (!fs.existsSync(DB_INIT_DIR)) {
    log.error(`Could not find DB initialization directory: ${DB_INIT_DIR}`);
    process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(DB_INIT_DIR, "migrations");

if (!fs.existsSync(MIGRATIONS_DIR)) {
    log.error(`Could not find migration directory: ${MIGRATIONS_DIR}`);
    process.exit(1);
}

export default {
    RESOURCE_DIR,
    MIGRATIONS_DIR,
    DB_INIT_DIR,
    ELECTRON_APP_ROOT_DIR
};
