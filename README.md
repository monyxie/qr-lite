# QR Lite

<img alt="QR Lite icon" src="https://github.com/monyxie/qr-lite/raw/2.0-dev/src/icons/qrlite.svg" width="48">

QR Lite is a browser extension for making and scanning QR codes offline.

[![Get the addon](https://blog.mozilla.org/addons/files/2015/11/get-the-addon.png 'Get the addon')](https://addons.mozilla.org/en-US/firefox/addon/qr-lite/)

## Features

* Generate QR code for current tab in popup.
* Generate QR code for selected link/text.
* Change error correction level of generated QR code.
* Scan QR codes in images.
* Keep track of generating and scanning history.

## Supported Browsers

This extension only supports Firefox at the moment.

## Development

A modified version of [qr-scanner-wechat](https://github.com/monyxie/qr-scanner-wechat) is used to workaround Mozilla's
4MB JS file limit.

Prerequisites: yarn, pnpm(qr-scanner-wechat)

1. Clone this repo and sync the submodules.
1. Run `yarn` to install dependencies.
1. Run `yarn run prepare` to build the modified qr-scanner-wechat and copy it to `src/`.
1. Run `yarn dev` to watch source files and automatically build the add-on when they change.
1. Load the temporary add-on by going to `about:debugging#/runtime/this-firefox`, then click "Load Temporary Add-on.."
   and choose `dist/manifest.json` in the project root.

## Building

Build steps on Linux:

1. Make sure you have `node`, `yarn`, `pnpm` (for building qr-scanner-wechat), and the `zip` command installed.
1. Open terminal and cd to project root.
1. Run `./release.sh`. After this you'll get two zip files in the `release` directory: `qr-lite-release-xxxxxxxx.zip`
   is the installable extension, while `qr-lite-source-xxxxxxxx.zip` is the source code zip.

## Localization

QR Lite supports the following languages:

- English
- 中文
- 日本語

Help us translate QR Lite into your language at [Crowdin](https://crowdin.com/project/qr-lite).

[![Crowdin](https://badges.crowdin.net/qr-lite/localized.svg)](https://crowdin.com/project/qr-lite)

## Credits

This extension
utilizes [ZXing for JS](https://github.com/zxing-js/library) / [qr-scanner-wechat](https://github.com/antfu/qr-scanner-wechat)
to encode/decode QR codes.

This extension was originally a fork of
[Javascript QR Code](https://addons.mozilla.org/zh-CN/firefox/addon/javascript-qr-code/)
which was written by Francesco De Stefano.

## License

MIT
