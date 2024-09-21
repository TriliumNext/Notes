#!/usr/bin/env bash

set -e  # Fail on any command error

VERSION=`jq -r ".version" package.json`
SERIES=${VERSION:0:4}-latest

cat package.json | grep -v electron > server-package.json

echo "Compiling typescript..."
npx tsc

sudo docker build -t triliumnext/notes:$VERSION --network host -t triliumnext/notes:$SERIES .

if [[ $VERSION != *"beta"* ]]; then
  sudo docker tag triliumnext/notes:$VERSION triliumnext/notes:latest
fi
