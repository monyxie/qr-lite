#!/bin/sh

set -e
set -x

OPENCV_COMMIT="4.9.0"
OPENCV_CONTRIB_COMMIT="4.9.0"

if ! command -v emcmake &>/dev/null; then
    echo "Command 'emcmake' not found. Install and/or activate emsdk/emscripten before running this script."
    exit 1;
fi

pushd "$(dirname "$0")"

if ! [ -d "opencv" ]; then
  git clone "https://github.com/opencv/opencv.git"
fi

pushd opencv
git fetch
git reset --hard
git checkout "$OPENCV_COMMIT"
popd

if ! [ -d "opencv_contrib" ]; then
  git clone "https://github.com/opencv/opencv_contrib.git"
fi

pushd opencv_contrib
git fetch
git reset --hard
git checkout "$OPENCV_CONTRIB_COMMIT"
git apply ../opencv_contrib.patch
popd

emcmake python opencv/platforms/js/build_js.py build_wasm \
            --build_wasm \
            --disable_single_file \
            --cmake_option='-DBUILD_LIST=wechat_qrcode,js' \
            --cmake_option='-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules' \
            --build_flags='-sDYNAMIC_EXECUTION=0' \
            --config=opencv_js.config.py

mkdir -p ../src/opencv/models
cp build_wasm/bin/opencv.js ../src/opencv/
cp build_wasm/bin/opencv_js.wasm ../src/opencv/
cp build_wasm/downloads/wechat_qrcode/detect.caffemodel ../src/opencv/models/
cp build_wasm/downloads/wechat_qrcode/detect.prototxt ../src/opencv/models/
cp build_wasm/downloads/wechat_qrcode/sr.caffemodel ../src/opencv/models/
cp build_wasm/downloads/wechat_qrcode/sr.prototxt ../src/opencv/models/
