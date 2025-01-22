"use strict";

import ini from "ini";
import fs from "fs";
import dataDir from "./data_dir.js";
import path from "path";
import resourceDir from "./resource_dir.js";

const configSampleFilePath = path.resolve(resourceDir.RESOURCE_DIR, "config-sample.ini");

if (!fs.existsSync(dataDir.CONFIG_INI_PATH)) {
    const configSample = fs.readFileSync(configSampleFilePath).toString("utf8");

    fs.writeFileSync(dataDir.CONFIG_INI_PATH, configSample);
}

// This function is used to override the config with environment variables - since environment variables
// should have precedence over the config file.
function getEnvironmentOverrides() {
    const overrides: Record<string, Record<string, string>> = {};

    for (const [key, value] of Object.entries(process.env)) {
        if (!key.startsWith('TRILIUM_') || !value) {
            continue;
        }

        // Remove TRILIUM_ prefix and split by underscore
        const parts = key.slice(8).split('_');

        if (parts.length < 2) {
            continue;
        }

        // First part is the section, rest is the key
        const section = parts[0];
        const configKey = parts.slice(1).join('_');

        if (!overrides[section]) {
            overrides[section] = {};
        }

        overrides[section][configKey] = value;
    }

    return overrides;
}

const fileConfig = ini.parse(fs.readFileSync(dataDir.CONFIG_INI_PATH, "utf-8"));
const envOverrides = getEnvironmentOverrides();

// Merge file config (config.ini) with environment variable overrides
const config = Object.keys(fileConfig).reduce((acc, section) => {
    acc[section] = {
        ...fileConfig[section],
        ...(envOverrides[section] || {})
    };
    return acc;
}, {} as Record<string, Record<string, string>>);

export default config;
