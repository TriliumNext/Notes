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
NODE_VERSION=20.15.1
NODE_ARCH=$ARCH

# Debug output
echo "Node arch: $NODE_ARCH"

# Special case for x64 in Node.js downloads
if [ "$NODE_ARCH" = "x64" ]; then
    NODE_FILENAME="x64"
elif [ "$NODE_ARCH" = "arm64" ]; then
    NODE_FILENAME="arm64"
fi

# Debug output
echo "Node filename: $NODE_FILENAME"

PKG_DIR=dist/trilium-linux-${ARCH}-server
echo "Package directory: $PKG_DIR"

if [ "$1" != "DONTCOPY" ]
then
    # Need to modify copy-trilium.sh to accept the target directory
    ./bin/copy-trilium.sh "$PKG_DIR"
fi

cd dist
wget https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_FILENAME}.tar.xz
tar xfJ node-v${NODE_VERSION}-linux-${NODE_FILENAME}.tar.xz
rm node-v${NODE_VERSION}-linux-${NODE_FILENAME}.tar.xz
cd ..

mv dist/node-v${NODE_VERSION}-linux-${NODE_FILENAME} $PKG_DIR/node

rm -r $PKG_DIR/node/lib/node_modules/npm
rm -r $PKG_DIR/node/include/node

rm -r $PKG_DIR/node_modules/electron*
rm -r $PKG_DIR/electron*.js

printf "#!/bin/sh\n./node/bin/node src/main" > $PKG_DIR/trilium.sh
chmod 755 $PKG_DIR/trilium.sh

cp bin/tpl/anonymize-database.sql $PKG_DIR/

cp -r translations $PKG_DIR/
cp -r dump-db $PKG_DIR/
rm -rf $PKG_DIR/dump-db/node_modules

VERSION=`jq -r ".version" package.json`

cd dist

tar cJf trilium-linux-${ARCH}-server-${VERSION}.tar.xz trilium-linux-${ARCH}-server
