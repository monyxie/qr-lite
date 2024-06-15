#!/usr/bin/env bash

# this script converts SVG icons to PNG icons of various sizes
# for Chrome does not support SVG icons

set -xe

pushd "$(dirname `dirname "$0"`)" || exit

for SIZE in 16 32 48 128
do
  inkscape -w "$SIZE" -h "$SIZE" "src/icons/qrlite.svg" -o "src/icons/qrlite-$SIZE.png"
done