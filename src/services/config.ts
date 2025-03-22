"use strict";

import ini from "ini";
import fs from "fs";
import dataDir from "./data_dir.js";
import path from "path";
import resourceDir from "./resource_dir.js";
import { envToBoolean } from "./utils.js";

const configSampleFilePath = path.resolve(resourceDir.RESOURCE_DIR, "config-sample.ini");

if (!fs.existsSync(dataDir.CONFIG_INI_PATH)) {
    const configSample = fs.readFileSync(configSampleFilePath).toString("utf8");

    fs.writeFileSync(dataDir.CONFIG_INI_PATH, configSample);
}

const iniConfig = ini.parse(fs.readFileSync(dataDir.CONFIG_INI_PATH, "utf-8"));

export interface TriliumConfig {
    General: {
        instanceName: string;
        noAuthentication: boolean;
        noBackup: boolean;
        noDesktopIcon: boolean;
    };
    Network: {
        host: string;
        port: string;
        https: boolean;
        certPath: string;
        keyPath: string;
        trustedReverseProxy: boolean | string;
    };
    Session: {
        cookiePath: string;
        cookieMaxAge: number;
    };
    Sync: {
        syncServerHost: string;
        syncServerTimeout: string;
        syncProxy: string;
    };
}

//prettier-ignore
const config: TriliumConfig = {

    General: {
        instanceName:
            process.env.TRILIUM_GENERAL_INSTANCENAME || iniConfig.General.instanceName || "",

        noAuthentication: 
            envToBoolean(process.env.TRILIUM_GENERAL_NOAUTHENTICATION) || iniConfig.General.noAuthentication || false,

        noBackup: 
            envToBoolean(process.env.TRILIUM_GENERAL_NOBACKUP) || iniConfig.General.noBackup || false,

        noDesktopIcon: 
            envToBoolean(process.env.TRILIUM_GENERAL_NODESKTOPICON) || iniConfig.General.noDesktopIcon || false
    },

    Network: {
        host:
            process.env.TRILIUM_NETWORK_HOST || iniConfig.Network.host || "0.0.0.0",

        port:
            process.env.TRILIUM_NETWORK_PORT || iniConfig.Network.port || "3000",

        https: 
            envToBoolean(process.env.TRILIUM_NETWORK_HTTPS) || iniConfig.Network.https || false,

        certPath: 
            process.env.TRILIUM_NETWORK_CERTPATH || iniConfig.Network.certPath || "",

        keyPath: 
            process.env.TRILIUM_NETWORK_KEYPATH  || iniConfig.Network.keyPath || "",

        trustedReverseProxy:
            process.env.TRILIUM_NETWORK_TRUSTEDREVERSEPROXY || iniConfig.Network.trustedReverseProxy || false
    },

    Session: {
        cookiePath:
            process.env.TRILIUM_SESSION_COOKIEPATH || iniConfig?.Session?.cookiePath || "/",

        cookieMaxAge:
            parseInt(String(process.env.TRILIUM_SESSION_COOKIEMAXAGE)) || parseInt(iniConfig?.Session?.cookieMaxAge) || 21 * 24 * 60 * 60 // 21 Days in Seconds
    },

    Sync: {
        syncServerHost:
            process.env.TRILIUM_SYNC_SERVER_HOST || iniConfig?.Sync?.syncServerHost || "",

        syncServerTimeout:
            process.env.TRILIUM_SYNC_SERVER_TIMEOUT || iniConfig?.Sync?.syncServerTimeout || "120000",

        syncProxy:
            // additionally checking in iniConfig for inconsistently named syncProxy for backwards compatibility
            process.env.TRILIUM_SYNC_SERVER_PROXY || iniConfig?.Sync?.syncProxy || iniConfig?.Sync?.syncServerProxy || ""
    }

};

export default config;
