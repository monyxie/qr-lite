# QR Lite

![Promo Banner](promo/chrome-webstore-promo.png)

QR Lite is a browser extension for generating and scanning QR codes offline.

[![Get the addon](https://blog.mozilla.org/addons/files/2015/11/get-the-addon.png "Get the addon")](https://addons.mozilla.org/en-US/firefox/addon/qr-lite/)
[![Get the addon](https://user-images.githubusercontent.com/585534/107280673-a5ece780-6a26-11eb-9cc7-9fa9f9f81180.png "Get from Microsoft")](https://microsoftedge.microsoft.com/addons/detail/qr-lite/lhncgpjmflilfegahnckekpbofgoioeg)

> Chrome is supported, however this extension is NOT available on Chrome Web Store, you have to build and install it from source yourself.

## Features

- Generate QR code for current tab in popup.
- Generate QR code for selected link/text.
- Change error correction level of generated QR code.
- Scan QR codes in images.
- Keep track of generating and scanning history.

## Permissions

QR Lite requires the following permissions:

- Access to the active tab (`activeTab`): mandatory, enables capturing image of the active page for scanning
- Context menus (`menus`/`contextMenus`): mandatory, enables the context menu items
- Storage (`storage`): mandatory, enables preferences and history persistence on disk
- Clipboard write (`clipboardWrite`): mandatory, enables copying QR code images or text to clipboard
- Scripting (`scripting`): mandatory, enables script injection for the following scenarios:
  - When _Select region to scan.._ is chosen, a script need to be injected to the active page to load the "scan region picker" UI
  - When _Scan QR code in Image_ is chosen, a script need to be injected to the active page to retrieve the image data
- Camera access: optional, enables QR code scanning with camera

## Development

Prerequisites: yarn

1. Clone this repo and sync the submodules.
1. Run `yarn` to install dependencies.
1. Run `yarn dev` to watch source files and automatically build the add-on when they change.
1. Use your browser's "Load unpacked extension" feature to load the extension at
   `dist/{firefox,chrome}/manifest.json` in the project root.

Use the script in `/opencv` to update the pre-built OpenCV library and wasm.

## Building

Build steps on Linux:

1. Make sure you have `node`, `yarn`, and the `zip` command installed.
1. Open terminal and cd to project root.
1. Run `node scripts/release.sh {firefox,chrome}`, which will generate 2 files in the `release` directory: `<browser>-<version>-<hash>-release.zip`
   is the installable extension, and `<browser>-<version>-<hash>-source.zip` is the zipped source code.

## Localization

As of now, translations for most of the languages are done by AI. You're welcome to help improve the translation or add your own translations, just submit a pull request.

## Credits

- [ZXing for JS](https://github.com/zxing-js/library) for generating QR code.
- [OpenCV + wechat_qrcode](https://docs.opencv.org/4.9.0/dd/d63/group__wechat__qrcode.html) for decoding QR code.
- [Javascript QR Code](https://addons.mozilla.org/zh-CN/firefox/addon/javascript-qr-code/) for the initial code base.

## License

MIT
