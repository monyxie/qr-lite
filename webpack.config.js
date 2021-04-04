const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  devtool: false,
  entry: {
    popup: { import: './src/popup/popup.js', filename: 'popup/popup.js' },
    background: { import: './src/background/background.js', filename: 'background/background.js' }
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
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' }
      ]
    })
  ],
  module: {
    rules: [
    ]
  }
}
