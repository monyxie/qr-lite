#!/bin/sh
set -x # echo on

DIST_DIR="$(pwd)/dist"
RELEASE_DIR="$(pwd)/release"
TARGET="$RELEASE_DIR/qr-lite-"$(git rev-parse HEAD | head -c8)".zip"

if [ ! -e "$RELEASE_DIR" ]; then
  mkdir "$RELEASE_DIR"
fi

if [ -e "$TARGET" ]; then
  rm "$TARGET"
fi

yarn run eslint src && yarn run webpack --mode production

if [ $? -eq 0 ]; then
  cd "$DIST_DIR"
  zip -r "$TARGET" ./*
fi
