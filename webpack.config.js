const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = env => {
  const browser = env.browser || 'firefox'
  console.log('browser: ', browser)
  const manifestFile = browser === 'firefox' ? 'manifest-firefox.json' : 'manifest-chrome.json'

  return {
    devtool: false,
    entry: {
      popup: { import: './src/popup/popup.js', filename: 'popup/popup.js' },
      grant: { import: './src/pages/grant.js', filename: 'pages/grant.js' },
      picker: { import: './src/pages/picker.js', filename: 'pages/picker.js' },
      // background.js have to be in the same directory as opencv_js.wasm
      background: { import: './src/background/background.js', filename: 'background.js' },
      picker_loader: { import: './src/content_scripts/picker-loader.js', filename: 'content_scripts/picker-loader.js' }
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, browser === 'chrome' ? 'dist/chrome' : 'dist/firefox'),
      clean: true
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/_locales', to: '_locales' },
          {
            from: 'src/icons',
            to: 'icons',
            filter: (path) => {
              // firefox only needs SVGs
              return browser === 'chrome' ? true : path.endsWith('.svg')
            }
          },
          { from: 'src/' + manifestFile, to: 'manifest.json' },
          { from: 'src/popup/popup.html', to: 'popup/popup.html' },
          { from: 'src/pages/grant.html', to: 'pages/grant.html' },
          { from: 'src/pages/picker.html', to: 'pages/picker.html' },
          { from: 'src/popup/popup.css', to: 'popup/popup.css' },
          { from: 'src/pages/grant.css', to: 'pages/grant.css' },
          { from: 'src/pages/picker.css', to: 'pages/picker.css' },
          { from: 'src/opencv/opencv_js.wasm', to: 'opencv_js.wasm' },
          { from: 'src/opencv/models', to: 'opencv/models' },
          { from: 'src/opencv/opencv.js', to: 'opencv/opencv.js' }
        ]
      }),
      new webpack.DefinePlugin({
        QRLITE_BROWSER: JSON.stringify(browser)
      })
    ],
    module: {
      rules: [
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader'
        }
      ]
    },
    resolve: {
      alias: {},
      extensions: ['.ts', '.js'],
      fallback: {
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false
      }
    }
  }
}
