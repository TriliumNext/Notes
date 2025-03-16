#!/usr/bin/env bash

set -e  # Fail on any command error
shopt -s globstar

BUILD_DIR="./build"

if ! [[ $(which npm) ]]; then
    echo "Missing npm"
    exit 1
fi

if [[ -d "$BUILD_DIR"/node_modules ]]; then
    # cleanup of useless files in dependencies
    for d in 'image-q/demo' \
        '@excalidraw/excalidraw/dist/excalidraw-assets-dev' '@excalidraw/excalidraw/dist/excalidraw.development.js' '@excalidraw/excalidraw/dist/excalidraw-with-preact.development.js' \
        'mermaid/dist/mermaid.js' \
        'boxicons/svg' 'boxicons/node_modules/react'/* \
        '@jimp/plugin-print/fonts' 'jimp/browser' 'jimp/fonts'; do
        [[ -e "$BUILD_DIR"/node_modules/"$d" ]] && rm -r "$BUILD_DIR"/node_modules/"$d"
    done
fi

find $BUILD_DIR/libraries -name "*.map" -type f -delete

unset f d BUILD_DIR
