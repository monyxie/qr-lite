#!/bin/sh
set -x # echo on

pushd "$(dirname "$0")"

if output=$(git status --porcelain) && [ -z "$output" ]; then
  echo "Working tree clean."
else
  read -p "Working tree dirty, new files won't be included. Continue(y)? " -n 1 -r
  echo    # (optional) move to a new line
  if [[ ! $REPLY =~ ^[Yy]$ ]]
  then
      exit 1;
  fi
fi

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
  git ls-tree --name-only -r HEAD | zip -r "$SOURCE_FILE" -@
fi
