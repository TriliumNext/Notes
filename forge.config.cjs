const path = require("path");
const fs = require("fs-extra");

const APP_NAME = "TriliumNext Notes";

const extraResourcesForPlatform = getExtraResourcesForPlatform();
const baseLinuxMakerConfigOptions = {
  icon: "./images/app-icons/png/128x128.png",
  desktopTemplate: path.resolve("./bin/electron-forge/desktop.ejs"),
  categories: ["Office", "Utility"]
};

module.exports = {
    // we run electron-forge inside the ./build folder,
    // to have it output to ./dist, we need to go up a directory first
    outDir: "../dist",
    packagerConfig: {
        executableName: "trilium",
        name: APP_NAME,
        overwrite: true,
        asar: true,
        icon: "./images/app-icons/icon",
        osxSign: {},
        osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID
        },
        extraResource: [
            // All resources should stay in Resources directory for macOS
            ...(process.platform === "darwin" ? [] : extraResourcesForPlatform),

            // These always go in Resources
            "translations/",
            "node_modules/@highlightjs/cdn-assets/styles"
        ],
        afterComplete: [
            (buildPath, _electronVersion, platform, _arch, callback) => {
                // Only move resources on non-macOS platforms
                if (platform !== "darwin") {
                    for (const resource of extraResourcesForPlatform) {
                        const baseName = path.basename(resource);
                        const sourcePath = path.join(buildPath, "resources", baseName);

                        // prettier-ignore
                        const destPath = (baseName !== "256x256.png")
                            ? path.join(buildPath, baseName)
                            : path.join(buildPath, "icon.png");

                        fs.move(sourcePath, destPath)
                            .then(() => callback())
                            .catch((err) => callback(err));
                    }
                } else {
                    callback();
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
                  ...baseLinuxMakerConfigOptions
                }
            }
        },
        {
            name: "@electron-forge/maker-flatpak",
            config: {
                options: {
                    ...baseLinuxMakerConfigOptions,
                    id: "com.triliumnext.notes",
                    runtimeVersion: "24.08",
                    base: "org.electronjs.Electron2.BaseApp",
                    baseVersion: "24.08",
                    baseFlatpakref: "https://flathub.org/repo/flathub.flatpakrepo",
                    modules: [
                        {
                            name: "zypak",
                            sources: {
                                type: "git",
                                url: "https://github.com/refi64/zypak",
                                tag: "v2024.01.17"
                            }
                        }
                    ]
                },
            }
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {
                options: {
                  ...baseLinuxMakerConfigOptions
                }
            }
        },
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                iconUrl: "https://raw.githubusercontent.com/TriliumNext/Notes/develop/images/app-icons/icon.ico",
                setupIcon: "./images/app-icons/win/setup.ico",
                loadingGif: "./images/app-icons/win/setup-banner.gif"
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
    const resources = [];

    const getScriptRessources = () => {
        const scripts = ["trilium-portable", "trilium-safe-mode", "trilium-no-cert-check"];
        const scriptExt = (process.platform === "win32") ? "bat" : "sh";
        return scripts.map(script => `./bin/tpl/${script}.${scriptExt}`);
    }

    switch (process.platform) {
        case "win32":
            resources.push(...getScriptRessources())
            break;
        case "linux":
            resources.push(...getScriptRessources(), "images/app-icons/png/256x256.png");
            break;
        default:
            break;
    }

    return resources;
}
