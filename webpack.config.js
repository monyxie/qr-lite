const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const svgo = require('svgo')

module.exports = env => (env.browser ? [env.browser] : ['firefox', 'chrome']).map(generateConfig)

/**
 * @param browser {string}
 */
function generateConfig (browser) {
  if (['firefox', 'chrome'].indexOf(browser) === -1) {
    throw new Error('Unsupported browser: ' + browser)
  }

  console.log('browser: ', browser)

  const manifestFile = browser === 'firefox' ? 'manifest-firefox.json' : 'manifest-chrome.json'

  const entries = [
    './background.js',
    './pages/popup.js',
    './pages/grant.js',
    './pages/picker.js',
    './content_scripts/picker-loader.js'
  ].reduce((acc, f) => {
    acc[f] = f
    return acc
  }, {})

  const copyPatterns = [
    { from: './' + manifestFile, to: 'manifest.json' },
    './_locales/**/*',
    {
      from: './icons/*.*',
      transform: {
        transformer: (content, absoluteFrom) => {
          // The `content` argument is a [`Buffer`](https://nodejs.org/api/buffer.html) object, it could be converted to a `String` to be processed using `content.toString()`
          // The `absoluteFrom` argument is a `String`, it is absolute path from where the file is being copied
          if (absoluteFrom.endsWith('.svg')) {
            return svgo.optimize(content.toString(), { path: absoluteFrom, multipass: true }).data
          }
          return content
        },
        cache: true
      }
    },
    './pages/*.{html,css}',
    { from: './opencv/opencv_js.wasm', to: 'opencv_js.wasm' },
    // './opencv/opencv.js', // has to be placed in extension's root to make both `import('...')` and `importScripts('...')` work
    './opencv/models/*'
  ]

  return {
    devtool: false,
    context: path.resolve(__dirname, 'src'),
    entry: entries,
    output: {
      filename: '[name]',
      path: path.resolve(__dirname, browser === 'chrome' ? 'dist/chrome' : 'dist/firefox'),
      clean: true
    },
    plugins: [
      new CopyPlugin({
        patterns: copyPatterns
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
