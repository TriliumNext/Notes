#!/usr/bin/env bash

set -e  # Fail on any command error

# Debug output
echo "Matrix Arch: $MATRIX_ARCH"

# Detect architecture from matrix input, fallback to system architecture
if [ -n "$MATRIX_ARCH" ]; then
    ARCH=$MATRIX_ARCH
else
    ARCH=$(uname -m)
    # Convert system architecture to our naming convention
    case $ARCH in
        x86_64) ARCH="x64" ;;
        aarch64) ARCH="arm64" ;;
    esac
fi

# Debug output
echo "Selected Arch: $ARCH"

# Set Node.js version and architecture-specific filename
NODE_VERSION=22.14.0

BUILD_DIR="./build"
DIST_DIR="./dist"
CLEANUP_SCRIPT="./scripts/cleanupNodeModules.ts"

# Trigger the build
echo "Build start"
npm run build:prepare-dist
echo "Build finished"

# pruning of unnecessary files and devDeps in node_modules
node --experimental-strip-types $CLEANUP_SCRIPT $BUILD_DIR

NODE_FILENAME=node-v${NODE_VERSION}-linux-${ARCH}

echo "Downloading Node.js runtime $NODE_FILENAME..."
cd $BUILD_DIR
wget -qO- https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILENAME}.tar.xz | tar xfJ -
mv $NODE_FILENAME node
cd ..


rm -rf $BUILD_DIR/node/lib/node_modules/{npm,corepack} \
    $BUILD_DIR/node/bin/{npm,npx,corepack} \
    $BUILD_DIR/node/CHANGELOG.md \
    $BUILD_DIR/node/include/node \
    $BUILD_DIR/node_modules/electron* \
    $BUILD_DIR/electron*.{js,map}

printf "#!/bin/sh\n./node/bin/node src/main\n" > $BUILD_DIR/trilium.sh
chmod 755 $BUILD_DIR/trilium.sh

# TriliumNextTODO: is this still required? If yes → move to copy-dist/copy-trilium
cp tpl/anonymize-database.sql $BUILD_DIR/

VERSION=`jq -r ".version" package.json`


ARCHIVE_NAME="TriliumNextNotes-Server-${VERSION}-linux-${ARCH}"
echo "Creating Archive $ARCHIVE_NAME..."

mkdir $DIST_DIR
cp -r "$BUILD_DIR" "$DIST_DIR/$ARCHIVE_NAME"
cd $DIST_DIR
tar cJf "$ARCHIVE_NAME.tar.xz" "$ARCHIVE_NAME"
rm -rf "$ARCHIVE_NAME"

echo "Server Build Completed!"