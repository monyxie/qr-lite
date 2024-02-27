#!/bin/sh
set -x # echo on

PROJECT_ROOT="$(pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
RELEASE_DIR="$PROJECT_ROOT/release"

HASH="$(git rev-parse HEAD | cut -c1-8)"

RELEASE_FILE="$RELEASE_DIR/qr-lite-release-$HASH.zip"
SOURCE_FILE="$RELEASE_DIR/qr-lite-source-$HASH.zip"

yarn install && yarn run eslint src && yarn run webpack --mode production

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

  cd "$DIST_DIR"
  zip -r "$RELEASE_FILE" ./*

  cd "$PROJECT_ROOT"
  zip -r "$SOURCE_FILE" src .eslintrc.json package.json README.md release.sh webpack.config.js yarn.lock
fi
