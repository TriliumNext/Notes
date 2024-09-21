const path = require('path');
const fs = require('fs-extra');

const APP_NAME = "TriliumNext Notes";

module.exports = {
  packagerConfig: {
    executableName: "trilium",
    name: APP_NAME,
    overwrite: true,
    asar: true,
    icon: "./images/app-icons/icon",
    extraResource: getExtraResourcesForPlatform(),
    afterComplete: [(buildPath, _electronVersion, platform, _arch, callback) => {
      const extraResources = getExtraResourcesForPlatform();
      for (const resource of extraResources) {
        let sourcePath;
        if (platform === 'darwin') {
          sourcePath = path.join(buildPath, `${APP_NAME}.app`, 'Contents', 'Resources', path.basename(resource));
        } else {
          sourcePath = path.join(buildPath, 'resources', path.basename(resource));
        }
        const destPath = path.join(buildPath, path.basename(resource));

        // Copy files from resources folder to root
        fs.move(sourcePath, destPath)
          .then(() => callback())
          .catch(err => callback(err));
      }
    }]
  },
  rebuildConfig: {
    force: true
  },
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: "./images/app-icons/png/128x128.png",
        }
      }
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: "https://raw.githubusercontent.com/TriliumNext/Notes/develop/images/app-icons/icon.ico",
        setupIcon: "./images/app-icons/icon.ico",
        loadingGif: "./images/app-icons/win/setup-banner.gif"
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: "./images/app-icons/icon.icns",
      }
    },
    {
      name: '@electron-forge/maker-zip',
      config: {
        options: {
          iconUrl: "https://raw.githubusercontent.com/TriliumNext/Notes/develop/images/app-icons/icon.ico",
          icon: "./images/app-icons/icon.ico",
        }
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};


function getExtraResourcesForPlatform() {
  let resources = ['dump-db/', './bin/tpl/anonymize-database.sql']
  const scripts = ['trilium-portable', 'trilium-safe-mode', 'trilium-no-cert-check']
  switch (process.platform) {
    case 'win32':
      for (const script of scripts) {
        resources.push(`./bin/tpl/${script}.bat`)
      }
      break;
    case 'darwin':
      break;
    case 'linux':
      for (const script of scripts) {
        resources.push(`./bin/tpl/${script}.sh`)
      }
      break;
    default:
      break;
  }

  return resources;
}