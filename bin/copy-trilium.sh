#!/usr/bin/env bash

set -e  # Fail on any command error
shopt -s globstar

BUILD_DIR="./build"

if ! [[ $(which npm) ]]; then
    echo "Missing npm"
    exit 1
fi

# Patch package.json main
sed -i 's|./dist/electron-main.js|electron-main.js|g' "$BUILD_DIR/package.json"

# run in subshell (so we return to original dir)
(cd $BUILD_DIR && npm ci --omit=dev)

if [[ -d "$BUILD_DIR"/node_modules ]]; then
    # cleanup of useless files in dependencies
    for d in 'image-q/demo' \
        '@excalidraw/excalidraw/dist/excalidraw-assets-dev' '@excalidraw/excalidraw/dist/excalidraw.development.js' '@excalidraw/excalidraw/dist/excalidraw-with-preact.development.js' \
        'mermaid/dist/mermaid.js' \
        'boxicons/svg' 'boxicons/node_modules/react'/* \
        '@jimp/plugin-print/fonts' 'jimp/browser' 'jimp/fonts'; do
        [[ -e "$BUILD_DIR"/node_modules/"$d" ]] && rm -r "$BUILD_DIR"/node_modules/"$d"
    done

    # delete all tests (there are often large images as test file for jimp etc.)
    for d in 'test' 'docs' 'demo' 'example'; do
        find "$BUILD_DIR"/node_modules -name "$d" -exec rm -rf {} +
    done
fi

find $BUILD_DIR/libraries -name "*.map" -type f -delete
find $BUILD_DIR/node_modules -name "*.map" -type f -delete
find $BUILD_DIR -name "*.ts" -type f -delete

unset f d BUILD_DIR
