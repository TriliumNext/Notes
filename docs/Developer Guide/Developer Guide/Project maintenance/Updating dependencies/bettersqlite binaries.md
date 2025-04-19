# bettersqlite binaries
### The native node bindings

`better-sqlite3` has native Node bindings. With updates of `better-sqlite3`, but also of Electron and Node.js versions, these bindings need to be updated.

Note that Electron and Node.js versions need different versions of these bindings, since Electron usually packs a different version of Node.js.

During development, `npm install` tries to build or reuse prebuilt natives for the current Node.js version. This makes `npm run start-server` work out of the box. Trying to run `npm run start-electron` with these versions generally causes an error such as this:

```
Uncaught Exception:
Error: The module '/Users/elian/Projects/Notes/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 108. This version of Node.js requires
NODE_MODULE_VERSION 116. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

### How the natives are handled

Locally, this can be fixed by rebuilding the binaries, which is what `npm run switch-electron` does, which uses `electron-rebuild` under the hood.

When the deliveries are built (see <a class="reference-link" href="../../Building%20and%20deployment/Build%20deliveries%20locally.md">Build deliveries locally</a>), it is not feasible to rebuild the dependencies since we are building for multiple platforms. Luckily, `better-sqlite3` provides these prebuilt binaries from us, available as artifacts on [their GitHub releases page](https://github.com/WiseLibs/better-sqlite3/releases/). 

The build script manages the natives for `better-sqlite3` by keeping a copy of the `.node` file for every platform in `bin/better-sqlite3`.

Whenever the version of `better-sqlite3` changes, the `.node` files must also be renewed based on their releases page. To simplify this process, a script was created in `bin/better-sqlite3/update.sh`.

## How to update the natives

The update script needs to know the version of Electron or Node.js for which to download the prebuilt binaries.

If you get errors during download, check on the [releases page](https://github.com/WiseLibs/better-sqlite3/releases/) to ensure that this particular combination of Electron/Node actually exists for the given release.

To determine the `NODE_MODULE_VERSION` that is required, look for `This version of Node.js requires`  
`NODE_MODULE_VERSION` in the error when starting Trilium via:

*   `npm run start-electron` (or run any Electron [delivery](../../Building%20and%20deployment/Build%20deliveries%20locally.md)), case in which the `ELECTRON_VERSION` variable needs to be changed.
*   `npm run start-server` (or run the Linux server delivery), case in which the `NODE_VERSION` variable needs to be changed.

Check which files got changed after running the update script and for each platform that got changed, test it locally via <a class="reference-link" href="../../Building%20and%20deployment/Build%20deliveries%20locally.md">Build deliveries locally</a> or via the CI.