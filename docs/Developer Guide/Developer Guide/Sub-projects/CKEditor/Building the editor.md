# Building the editor
First, make sure <a class="reference-link" href="Environment%20setup.md">Environment setup</a> is set up.

## Trigger the build

```
cd packages/ckeditor5-build-trilium
yarn build
```

This will trigger a change in the `build` directory.

## Copy the build artifact to the main repo

Go to `packages/ckeditor5-build-balloon-trilium/build` and copy `ckeditor.js` and `ckeditor.js.map` to `libraries/ckeditor` in the `Notes` repository.

An example shell command to copy it:

```
cp build/ckeditor.* ~/Projects/TriliumNext/Notes/libraries/ckeditor/
```