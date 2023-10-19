const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = env => {
  const browser = env.browser || 'firefox'
  console.log('browser: ', browser)
  const manifestFile = browser === 'chrome' ? 'manifest-chrome.json' : 'manifest.json'

  return {
    devtool: false,
    entry: {
      popup: { import: './src/popup/popup.js', filename: 'popup/popup.js' },
      grant: { import: './src/pages/grant.js', filename: 'pages/grant.js' },
      background: { import: './src/background/background.js', filename: 'background/background.js' },
      scan_region_picker: {
        import: './src/content_scripts/scan_region_picker.js',
        filename: 'content_scripts/scan_region_picker.js'
      }
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/_locales', to: '_locales' },
          { from: 'src/icons', to: 'icons' },
          { from: 'src/' + manifestFile, to: 'manifest.json' },
          { from: 'src/popup/popup.html', to: 'popup/popup.html' },
          { from: 'src/pages/grant.html', to: 'pages/grant.html' },
          { from: 'src/popup/popup.css', to: 'popup/popup.css' },
          { from: 'src/pages/grant.css', to: 'pages/grant.css' }
        ]
      }),
      new webpack.DefinePlugin({
        QRLITE_BROWSER: JSON.stringify(browser)
      })
    ],
    module: {
      rules: []
    }
  }
}
