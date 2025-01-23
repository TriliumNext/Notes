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

const iniConfig = ini.parse(fs.readFileSync(dataDir.CONFIG_INI_PATH, "utf-8"));

const defaultConfig = {
    General: {
        instanceName: '',
        noAuthentication: false,
        noBackup: false,
        noDesktopIcon: false,
    },
    Network: {
        host: '0.0.0.0',
        port: 8080,
        https: false,
        certPath: '',
        keyPath: '',
        trustedReverseProxy: false,
    },
    Sync: {
        syncServerHost: '',
        syncServerTimeout: 120000,
        syncProxy: '',
    }
}

// Strongly define the configuration values here
// We prefer the environment variables over the ini file's values here, so that the user can "override" the values as needed.
const config = {
    General: {
        instanceName: process.env.TRILIUM_INSTANCENAME || iniConfig.General.instanceName || defaultConfig.General.instanceName,
        noAuthentication: process.env.TRILIUM_NOAUTHENTICATION || iniConfig.General.noAuthentication || defaultConfig.General.noAuthentication,
        noBackup: process.env.TRILIUM_NOBACKUP || iniConfig.General.noBackup || defaultConfig.General.noBackup,
        noDesktopIcon: process.env.TRILIUM_NODESKTOPICON || iniConfig.General.noDesktopIcon || defaultConfig.General.noDesktopIcon,
    },
    Network: {
        host: process.env.TRILIUM_HOST || iniConfig.Network.host || defaultConfig.Network.host,
        port: process.env.TRILIUM_PORT || iniConfig.Network.port || defaultConfig.Network.port,
        https: process.env.TRILIUM_HTTPS || iniConfig.Network.https || defaultConfig.Network.https,
        certPath: process.env.TRILIUM_CERTPATH || iniConfig.Network.certPath || defaultConfig.Network.certPath,
        keyPath: process.env.TRILIUM_KEYPATH || iniConfig.Network.keyPath || defaultConfig.Network.keyPath,
        trustedReverseProxy: process.env.TRILIUM_TRUSTEDREVERSEPROXY || iniConfig.Network.trustedReverseProxy || defaultConfig.Network.trustedReverseProxy,
    },
    Sync: {
        syncServerHost: process.env.TRILIUM_SYNCSERVERHOST || iniConfig.Sync.syncServerHost || defaultConfig.Sync.syncServerHost,
        syncServerTimeout: process.env.TRILIUM_SYNCSERVERTIMEOUT || iniConfig.Sync.syncServerTimeout || defaultConfig.Sync.syncServerTimeout,
        syncProxy: process.env.TRILIUM_SYNCPROXY || iniConfig.Sync.syncProxy || defaultConfig.Sync.syncProxy,
    }
}

export default config;
