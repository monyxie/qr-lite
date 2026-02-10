#!/bin/bash

# this script generates a release zip ball and a source code zip ball for the specified browser
# specify the browser in the first argument (firefox/chrome)

set -x # echo on

BROWSER="$1"

case "$BROWSER" in
  firefox)
    ;;
  chrome)
    ;;
  *)
    echo "You need to specify which browser to build for - pass 'firefox' or 'chrome' as the first argument."
    exit 1
    ;;
esac

pushd "$(dirname `dirname "$0"`)" || exit

if output=$(git status --porcelain) && [ -z "$output" ]; then
  echo "Working tree clean."
else
  read -p "Working tree dirty, new files won't be included. Continue(y/N)? " -n 1 -r
  echo    # (optional) move to a new line
  if [[ ! $REPLY =~ ^[Yy]$ ]]
  then
      exit 1;
  fi
fi

PROJECT_ROOT="$(pwd)"
DIST_DIR="$PROJECT_ROOT/dist/$BROWSER"
RELEASE_DIR="$PROJECT_ROOT/release"
VERSION=$(node src/manifest.js "$BROWSER" | node -e "process.stdin.setEncoding('utf8');let data='';process.stdin.on('data',chunk=>data+=chunk);process.stdin.on('end',()=>console.log(JSON.parse(data).version));")

TAG="${GITHUB_REF_NAME}"
if [ -z "$TAG" ]; then
  TAG="$(git describe --tags --exact-match 2>/dev/null)"
fi
if [ -z "$TAG" ]; then
  TAG="v$VERSION"
fi

RELEASE_FILE="$RELEASE_DIR/$BROWSER-$TAG-release.zip"
SOURCE_FILE="$RELEASE_DIR/$BROWSER-$TAG-source.zip"

yarn install && yarn run eslint src && yarn run webpack --mode production --env browser="$BROWSER"

if [ $? -eq 0 ]; then

  if [ ! -e "$RELEASE_DIR" ]; then
    mkdir "$RELEASE_DIR"
  fi
  if [ -e "$RELEASE_FILE" ]; then
    rm "$RELEASE_FILE"
  fi
  if [ -e "$SOURCE_FILE" ]; then
    rm "$SOURCE_FILE"
  fi

  cd "$DIST_DIR" || exit
  zip -r -9 "$RELEASE_FILE" ./*

  cd "$PROJECT_ROOT" || exit
  git ls-tree --name-only -r HEAD | zip -9 "$SOURCE_FILE" --exclude 'promo/*' -@
fi
