"use strict";

import fs from "fs";
import dataDir from "./data_dir.js";
import log from "./log.js";
import { randomSecureToken } from "./utils.js";

const sessionSecretPath = `${dataDir.TRILIUM_DATA_DIR}/session_secret.txt`;

let sessionSecret: string;

const ENCODING = "ascii";

if (!fs.existsSync(sessionSecretPath)) {
    sessionSecret = randomSecureToken(64).slice(0, 64);

    log.info("Generated session secret");

    fs.writeFileSync(sessionSecretPath, sessionSecret, ENCODING);
} else {
    sessionSecret = fs.readFileSync(sessionSecretPath, ENCODING);
}

export default sessionSecret;
