#!/usr/bin/env bash

# this script converts SVG icons to PNG icons of various sizes
# for Chrome does not support SVG icons

set -xe

for SIZE in 16 32 64 128 256 512 1024
do
  inkscape -w "$SIZE" -h "$SIZE" "src/icons/qrlite.svg" -o "src/icons/qrlite-$SIZE.png"
done

for SIZE in 16 32 64 128 256 512 1024
do
  inkscape -w "$SIZE" -h "$SIZE" "src/icons/qrlite-dark.svg" -o "src/icons/qrlite-dark-$SIZE.png"
done

for SIZE in 16 32 64 128 256 512 1024
do
  inkscape -w "$SIZE" -h "$SIZE" "src/icons/qrlite-light.svg" -o "src/icons/qrlite-light-$SIZE.png"
done
