# Updating to a newer version of CKEditor
## Before updating

Make sure that all the plugins are compatible with this version:  <a class="reference-link" href="Versions%20and%20external%20plugins.md">Versions and external plugins</a>. If not, they will need to be updated to the same version as the one you are updating, by altering their `package.json`.

If the plugin is external to the Trilium organisation, it needs to be forked first.

## Environment setup

The first step is to add the CKEditor source as a remote. This only needs to be done once.

```
git remote add upstream ssh://git@github.com/ckeditor/ckeditor5.git
git fetch upstream
```

## Update steps

Due to how the repository is structured, updates to the CKEditor are a bit difficult.

1.  `git fetch upstream`
2.  Pick a version and merge with it: `git merge -X theirs v99.2.0`
3.  When there are complicated conflicts, sometimes it's easier to take everything from the target version instead, for a given path: `git checkout v99.2.0 -- "packages/ckeditor5-list/**"`.
4.  Go in `packages/ckeditor5-build-trilium/package.json` and run `node sync-version.js` to update the `package.json` with the new versions. Review and commit the change.
5.  Follow again the dependency setup in <a class="reference-link" href="Environment%20setup.md">Environment setup</a>, as they have changed.
6.  [Run the build](Building%20the%20editor.md) and check that it works.

## Final steps

1.  Start the TriliumNext server
2.  If updated to a newer version of CKEditor, check type `CKEDITOR_VERSION` in the browser/Electron console to ensure that the correct version is used.
3.  Do a basic sanity check as well.
4.  Commit and push the change on both sides (in the `trilium-ckeditor5` repo and in the `Notes` repo).

## Troubleshooting client side errors

These errors might show up when testing the Trilium app:

```
ReferenceError: CKEditor is not defined
```

Usually this is a side effect of another error, check the logs carefully to see if there is any other related error (perhaps a `CKEditorError`).

* * *

```
Uncaught error: Message: CKEditorError: ckeditor-duplicated-modules
```

Most likely cause is one of the external plugins is incompatible with this version.

For example, to disable the Math plugin, go to `packages/ckeditor5-build-trilium/src/config.ts` and modify:

```diff
-import Math from '@triliumnext/ckeditor5-math/src/math';
-import AutoformatMath from '@triliumnext/ckeditor5-math/src/autoformatmath';

export const COMMON_PLUGINS = [
-	Math,
-	AutoformatMath,
]
```

In this case, make sure to align the version of all the external plugins with the one you are updating to, usually by forking the external plugin and updating its versions.