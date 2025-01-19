const path = require("path");
const fs = require("fs-extra");
const APP_NAME = "TriliumNext Notes";

module.exports = {
    packagerConfig: {
        executableName: "trilium",
        name: APP_NAME,
        overwrite: true,
        asar: true,
        icon: "./images/app-icons/icon",
        windowsSign: {
            hookModulePath: "bin\\sign-windows.cjs"
        },
        extraResource: [
            // Moved to root
            ...getExtraResourcesForPlatform(),

            // Moved to resources (TriliumNext Notes.app/Contents/Resources on macOS)
            "translations/",
            "node_modules/@highlightjs/cdn-assets/styles"
        ],
        afterComplete: [
            (buildPath, _electronVersion, platform, _arch, callback) => {
                const extraResources = getExtraResourcesForPlatform();
                for (const resource of extraResources) {
                    const baseName = path.basename(resource);
                    let sourcePath;
                    if (platform === "darwin") {
                        sourcePath = path.join(buildPath, `${APP_NAME}.app`, "Contents", "Resources", baseName);
                    } else {
                        sourcePath = path.join(buildPath, "resources", baseName);
                    }
                    let destPath;

                    if (baseName !== "256x256.png") {
                        destPath = path.join(buildPath, baseName);
                    } else {
                        destPath = path.join(buildPath, "icon.png");
                    }

                    // Copy files from resources folder to root
                    fs.move(sourcePath, destPath)
                        .then(() => callback())
                        .catch((err) => callback(err));
                }
            }
        ]
    },
    rebuildConfig: {
        force: true
    },
    makers: [
        {
            name: "@electron-forge/maker-deb",
            config: {
                options: {
                    icon: "./images/app-icons/png/128x128.png",
                    desktopTemplate: path.resolve("./bin/electron-forge/desktop.ejs")
                }
            }
        },
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                iconUrl: "https://raw.githubusercontent.com/TriliumNext/Notes/develop/images/app-icons/icon.ico",
                setupIcon: "./images/app-icons/icon.ico",
                loadingGif: "./images/app-icons/win/setup-banner.gif",
                windowsSign: {
                    hookModulePath: "bin\\sign-windows.js"
                }
            }
        },
        {
            name: "@electron-forge/maker-dmg",
            config: {
                icon: "./images/app-icons/icon.icns"
            }
        },
        {
            name: "@electron-forge/maker-zip",
            config: {
                options: {
                    iconUrl: "https://raw.githubusercontent.com/TriliumNext/Notes/develop/images/app-icons/icon.ico",
                    icon: "./images/app-icons/icon.ico"
                }
            }
        }
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {}
        }
    ]
};

function getExtraResourcesForPlatform() {
    let resources = ["dump-db/", "./bin/tpl/anonymize-database.sql"];
    const scripts = ["trilium-portable", "trilium-safe-mode", "trilium-no-cert-check"];
    switch (process.platform) {
        case "win32":
            for (const script of scripts) {
                resources.push(`./bin/tpl/${script}.bat`);
            }
            break;
        case "darwin":
            break;
        case "linux":
            resources.push("images/app-icons/png/256x256.png");
            for (const script of scripts) {
                resources.push(`./bin/tpl/${script}.sh`);
            }
            break;
        default:
            break;
    }

    return resources;
}
