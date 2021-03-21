#!/bin/sh
set -x # echo on

TARGET="build/qr-lite-"$(git rev-parse HEAD | head -c8)".zip"

if [ -e "$TARGET" ]; then
  rm "$TARGET"
fi

zip -r "$TARGET" assets data background.js manifest.json
