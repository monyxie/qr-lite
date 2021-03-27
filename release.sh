#!/bin/sh
set -x # echo on

PROJECT_ROOT="$(pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
RELEASE_DIR="$PROJECT_ROOT/release"

COMMON_NAME="qr-lite-"$(git branch --show-current)"-"$(git rev-parse HEAD | head -c8)
RELEASE_FILE="$RELEASE_DIR/$COMMON_NAME-release.zip"
SOURCE_FILE="$RELEASE_DIR/$COMMON_NAME-source.zip"

yarn run eslint src && yarn run webpack --mode production

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
  zip -r "$SOURCE_FILE" src package.json README.md release.sh webpack.config.js yarn.lock
fi
