#!/usr/bin/env bash

export GITHUB_REPO=trilium

if [[ $# -eq 0 ]] ; then
    echo "Missing argument of new version"
    exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Missing command: jq"
  exit 1
fi

VERSION=$1

if ! [[ ${VERSION} =~ ^[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{1,2}(-.+)?$ ]] ;
then
    echo "Version ${VERSION} isn't in format X.Y.Z"
    exit 1
fi

if ! git diff-index --quiet HEAD --; then
    echo "There are uncommitted changes"
    exit 1
fi

echo "Releasing Trilium $VERSION"

jq '.version = "'$VERSION'"' package.json > package.json.tmp
mv package.json.tmp package.json

git add package.json

npm run update-build-info

git add src/services/build.ts

TAG=v$VERSION

echo "Committing package.json version change"

git commit -m "release $VERSION"
git push

echo "Tagging commit with $TAG"

git tag $TAG
git push origin $TAG
