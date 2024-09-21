#!/usr/bin/env bash

set -e  # Fail on any command error

PKG_DIR=dist/trilium-linux-x64-server
NODE_VERSION=20.15.1

if [ "$1" != "DONTCOPY" ]
then
    ./bin/copy-trilium.sh $PKG_DIR
fi

cd dist
wget https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz
tar xfJ node-v${NODE_VERSION}-linux-x64.tar.xz
rm node-v${NODE_VERSION}-linux-x64.tar.xz
cd ..

mv dist/node-v${NODE_VERSION}-linux-x64 $PKG_DIR/node

rm -r $PKG_DIR/node/lib/node_modules/npm
rm -r $PKG_DIR/node/include/node

rm -r $PKG_DIR/node_modules/electron*
rm -r $PKG_DIR/electron*.js

printf "#!/bin/sh\n./node/bin/node src/www" > $PKG_DIR/trilium.sh
chmod 755 $PKG_DIR/trilium.sh

cp bin/tpl/anonymize-database.sql $PKG_DIR/

cp -r dump-db $PKG_DIR/
rm -rf $PKG_DIR/dump-db/node_modules

VERSION=`jq -r ".version" package.json`

cd dist

tar cJf trilium-linux-x64-server-${VERSION}.tar.xz trilium-linux-x64-server
