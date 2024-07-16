#!/usr/bin/env bash

if ! command -v jq &> /dev/null; then
  echo "Missing command: jq"
  exit 1
fi

if ! command -v fakeroot &> /dev/null; then
  echo "Missing command: fakeroot"
  exit 1
fi

if ! command -v dpkg-deb &> /dev/null; then
  echo "Missing command: dpkg-deb"
  exit 1
fi

if dpkg-deb 2>&1 | grep BusyBox &> /dev/null; then
  echo "The dpkg-deb binary provided by BusyBox is not compatible. The Debian tool needs to be used instead."
  exit 1
fi

SRC_DIR=./dist/trilium-linux-x64-src

[ "$1" != "DONTCOPY" ] && ./bin/copy-trilium.sh "$SRC_DIR"

rm -r "$SRC_DIR"/src/public/app-dist/*.mobile.*

echo "Packaging linux x64 electron build"
./node_modules/.bin/electron-packager "$SRC_DIR" --asar --out=dist --executable-name=trilium --platform=linux --arch=x64 --overwrite

BUILD_DIR=./dist/trilium-linux-x64
rm -rf "$BUILD_DIR"

mv "./dist/Trilium Notes-linux-x64" "$BUILD_DIR"

cp images/app-icons/png/128x128.png "$BUILD_DIR"/icon.png
cp bin/tpl/anonymize-database.sql "$BUILD_DIR"/

cp -r dump-db "$BUILD_DIR"/
rm -rf "$BUILD_DIR"/dump-db/node_modules

for f in 'trilium-portable' 'trilium-safe-mode' 'trilium-no-cert-check'; do
    cp bin/tpl/"$f".sh "$BUILD_DIR"/
    chmod 755 "$BUILD_DIR"/"$f".sh
done

echo "Packaging linux x64 electron distribution..."
VERSION=`jq -r ".version" package.json`

pushd dist
    tar cJf "trilium-linux-x64-${VERSION}.tar.xz" trilium-linux-x64
popd

bin/build-debian.sh
