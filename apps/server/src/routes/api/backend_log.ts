"use strict";

import { readFile } from "fs/promises";
import { join } from "path";
import dateUtils from "../../services/date_utils.js";
import dataDir from "../../services/data_dir.js";
import log from "../../services/log.js";
import { t } from "i18next";

const { LOG_DIR } = dataDir;

async function getBackendLog() {
    const fileName = `trilium-${dateUtils.localNowDate()}.log`;
    try {
        const file = join(LOG_DIR, fileName);
        return await readFile(file, "utf8");
    } catch (e) {
        const isErrorInstance = e instanceof Error;

        // most probably the log file does not exist yet - https://github.com/zadam/trilium/issues/1977
        if (isErrorInstance && "code" in e && e.code === "ENOENT") {
            log.error(e);
            return t("backend_log.log-does-not-exist", { fileName });
        }

        log.error(isErrorInstance ? e : `Reading the backend log '${fileName}' failed with an unknown error: '${e}'.`);
        return t("backend_log.reading-log-failed", { fileName });
    }
}

export default {
    getBackendLog
};
