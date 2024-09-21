#!/usr/bin/env bash

set -e  # Fail on any command error

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

if ! command -v wine &> /dev/null; then
  echo "Missing command: wine"
  exit 1
fi

echo "Deleting existing builds"

rm -rf dist/*

SRC_DIR=dist/trilium-src

bin/copy-trilium.sh $SRC_DIR

# we'll just copy the same SRC dir to all the builds so we don't have to do npm install in each separately
cp -r $SRC_DIR ./dist/trilium-linux-x64-src
cp -r $SRC_DIR ./dist/trilium-linux-x64-server
cp -r $SRC_DIR ./dist/trilium-windows-x64-src
cp -r $SRC_DIR ./dist/trilium-mac-x64-src
cp -r $SRC_DIR ./dist/trilium-mac-arm64-src

bin/build-win-x64.sh DONTCOPY

bin/build-mac-x64.sh DONTCOPY

bin/build-mac-arm64.sh DONTCOPY

bin/build-linux-x64.sh DONTCOPY

bin/build-server.sh DONTCOPY
