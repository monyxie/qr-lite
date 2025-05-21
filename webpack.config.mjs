import path from "path";
import webpack from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import svgo from "svgo";
import ScriptOutputPlugin from "./webpack/ScriptOutputPlugin.mjs";

export default (env, { mode }) => {
  return (env.browser ? [env.browser] : ["firefox", "chrome"]).map((browser) =>
    generateConfig(browser, mode === "development")
  );
};

/**
 * @param browser {string}
 */
function generateConfig(browser, debug) {
  if (["firefox", "chrome"].indexOf(browser) === -1) {
    throw new Error("Unsupported browser: " + browser);
  }

  console.log(`browser: ${browser} debug: ${debug}`);

  const entries = [
    "./background.js",
    "./pages/popup.js",
    "./pages/grant.js",
    "./pages/picker.js",
    "./pages/settings.js",
    "./content_scripts/picker-loader.js",
  ].reduce((acc, f) => {
    acc[f] = f;
    return acc;
  }, {});

  const copyPatterns = [
    "./_locales/**/*",
    {
      from: "./icons/*.*",
      transform: {
        transformer: (content, absoluteFrom) => {
          // The `content` argument is a [`Buffer`](https://nodejs.org/api/buffer.html) object, it could be converted to a `String` to be processed using `content.toString()`
          // The `absoluteFrom` argument is a `String`, it is absolute path from where the file is being copied
          if (absoluteFrom.endsWith(".svg")) {
            return svgo.optimize(content.toString(), {
              path: absoluteFrom,
              multipass: true,
            }).data;
          }
          return content;
        },
        cache: true,
      },
    },
    "./pages/*.{html,css}",
    { from: "./opencv/opencv_js.wasm", to: "opencv_js.wasm" },
    // './opencv/opencv.js', // has to be placed in extension's root to make both `import('...')` and `importScripts('...')` work
    "./opencv/models/*",
    // "./audio/*.mp3", // unnecessary because loaded via import
  ];

  return {
    devtool: false,
    context: path.resolve(".", "src"),
    entry: entries,
    output: {
      filename: "[name]",
      path: path.resolve(
        ".",
        browser === "chrome" ? "dist/chrome" : "dist/firefox"
      ),
      clean: true,
    },
    plugins: [
      new CopyPlugin({
        patterns: copyPatterns,
      }),
      new webpack.DefinePlugin({
        QRLITE_BROWSER: JSON.stringify(browser),
        QRLITE_DEBUG: JSON.stringify(debug),
      }),
      new ScriptOutputPlugin({
        scriptPath: "./src/manifest.js",
        args: browser,
        outputFilename: "manifest.json",
      }),
    ],
    module: {
      rules: [
        {
          // load mp3 via dataURL to workaround https://bugzilla.mozilla.org/show_bug.cgi?id=1965971
          test: /\.(mp3)$/i,
          type: "asset/inline",
        },
        {
          test: /\.svg$/,
          loader: "svg-inline-loader",
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              plugins: [
                [
                  "@babel/plugin-transform-react-jsx",
                  {
                    // pragma: 'h',
                    // pragmaFrag: 'Fragment',
                    runtime: "automatic",
                  },
                ],
              ],
            },
          },
        },
      ],
    },
    resolve: {
      alias: {},
      extensions: [".ts", ".js"],
      fallback: {
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
      },
    },
  };
}
