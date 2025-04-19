# Running a development build
As always, install the dependencies for the first time (and re-run whenever there are errors about missing dependencies):

```
npm install
```

## Run server

Run with default settings:

```
npm run start-server
```

Run with custom port:

```
TRILIUM_PORT=8082 npm run start-server
```

## Run Electron

Rebuild `better-sqlite3` dependency:

```
npm run switch-electron
```

Then run Electron:

```
npm run start-electron
```

To run Electron using the same data directory as the production version:

```
npm run start-electron-no-dir
```

When done, switch back the `better-sqlite3` dependency:

```
npm run switch-server
```

## Quick switch

To start Electron without running `switch-electron` first:

```
npm run qstart-electron
```

Similarly, to start the server without running `switch-server` first:

```
npm run qstart-server
```

## Safe mode

Safe mode is off by default, to enable it temporarily on a Unix shell, prepend the environment variable setting:

```
TRILIUM_SAFE_MODE=1 npm run start-server
```

To have the same behaviour on Windows, we would need to alter `package.json`:

```diff
-"start-electron": "npm run prepare-dist && cross-env TRILIUM_DATA_DIR=./data TRILIUM_SYNC_SERVER_HOST=http://tsyncserver:4000 TRILIUM_ENV=dev electron ./dist/electron-main.js --inspect=5858 .",
+"start-electron": "npm run prepare-dist && cross-env TRILIUM_SAFE_MODE=1 TRILIUM_DATA_DIR=./data TRILIUM_SYNC_SERVER_HOST=http://tsyncserver:4000 TRILIUM_ENV=dev electron ./dist/electron-main.js --inspect=5858 .",
```

## Running on NixOS

When doing development, the Electron binary retrieved from NPM is not going to be compatible with NixOS, resulting in errors when trying to run it. To bypass this, there is a special command to run electron using `nix-shell`:

```
npm run start-electron-nix
```

Similarly to the original command, to use the same data directory as the production version:

```
npm run start-electron-no-dir-nix
```