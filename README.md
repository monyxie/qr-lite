# QR Lite
A browser extension for making/scanning QR codes in pure Javascript.

## Features
* Generate QR code for current tab in popup.
* Generate QR code for selected link/text.
* Change error correction level of generated QR code.
* Decode QR code in images.

## Supported Browsers
This extension only supports Firefox at the moment.
  
## Build Steps

The build script only supports Linux.

1. Make sure you have Node >= v14.16.0, Yarn >= 1.22.10, and the `zip` command installed.
1. Open terminal and cd to project root.
1. Run `./release.sh`. After this you'll get two zip files in the `release` directory: `qr-lite-release.zip`
is the installable extension, while `qr-lite-source.zip` is the source code.
   
## Todo
* Localization
  
## Credits

This extension utilizes the [ZXing for JS](https://github.com/zxing-js/library) to encode/decode QR codes.

This extension is originally a fork of
[Javascript QR Code](https://addons.mozilla.org/zh-CN/firefox/addon/javascript-qr-code/)
which was written by Francesco De Stefano.

## License

MIT