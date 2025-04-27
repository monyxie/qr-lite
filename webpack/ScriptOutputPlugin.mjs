import { exec } from "child_process";
import path from "path";

export default class ScriptOutputPlugin {
  constructor(options) {
    this.scriptPath = options.scriptPath;
    this.args = options.args || "";
    this.outputFilename = options.outputFilename;
  }

  apply(compiler) {
    compiler.hooks.afterCompile.tap("ScriptOutputPlugin", (compilation) => {
      // Add the script file as a dependency so webpack watches it
      compilation.fileDependencies.add(path.resolve(this.scriptPath));
    });

    compiler.hooks.compilation.tap("ScriptOutputPlugin", (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: "ScriptOutputPlugin",
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        (assets, callback) => {
          exec(`node ${this.scriptPath} ${this.args}`, (error, stdout) => {
            if (error) {
              console.error(`Execution error: ${error}`);
              return callback(error);
            }

            compilation.emitAsset(this.outputFilename, {
              source: () => stdout,
              size: () => stdout.length,
            });

            callback();
          });
        }
      );
    });
  }
}
