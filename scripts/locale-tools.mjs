import util from "node:util";
import fs from "node:fs";
import { exec, spawn } from "node:child_process";
import path from "node:path";

function readDirectory(dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(files);
    });
  });
}

function readJSONFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    });
  });
}

async function ensureCommited(files) {
  const gitStatus = await util.promisify(exec)(
    `git status --porcelain ${files.join(" ")}`
  );
  if (gitStatus.stdout.trim().length > 0) {
    throw new Error(
      `The following file(s) has uncommitted changes. Please commit or stash before applying changes.\n${gitStatus.stdout}`
    );
  }
}

async function extractKeysFromSource() {
  // check "rg" availability
  await util.promisify(exec)("which rg");

  const args = [
    "-e",
    "__MSG_(\\w+)__",
    "-e",
    "apiNs\\.i18n\\.getMessage\\s*\\(\\s*['\"](\\w+)['\"]",
    "-e",
    "T?T\\s*\\(\\s*['\"](\\w+)\\s*['\"]",
    "src",
    "--glob",
    "src/**/*.{js,json,html}",
    "--glob",
    "!src/{_locales,icons,opencv}/**",
    "--multiline",
    "--no-filename",
    "--no-heading",
    "--no-line-number",
    "--only-matching",
    "--replace",
    "$1$2$3", // $1 - $X where X = number of patterns (`-e`)
  ];

  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const rg = spawn("rg", args);
    rg.stdout.on("data", (data) => {
      stdout += data;
    });
    rg.stderr.on("data", (data) => {
      stderr += data;
    });
    rg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("rg command failed to run: " + stderr));
      }
      const map = stdout.split("\n").reduce((a, c) => {
        if (c !== "") {
          a[c] = 1;
        }
        return a;
      }, {});
      resolve(Object.keys(map));
    });
  });
}

async function checkSourceLocale(keysInCode) {
  const srcLocale = "en";
  const srcMessages = await readJSONFile(
    `./src/_locales/${srcLocale}/messages.json`
  );

  let unused = [];
  let missing = [];
  for (const key in srcMessages) {
    if (keysInCode.indexOf(key) === -1) {
      unused.push(key);
      console.log("\x1b[33m%s\x1b[0m", `SRC(${srcLocale}): "${key}" is unused`);
    }
  }

  // predefined messages. amongst these "version" is defined by this project.
  const predefined = [
    "extension_id",
    "ui_locale",
    "bidi_dir",
    "bidi_reversed_dir",
    "bidi_start_edge",
    "bidi_end_edge",
    "version",
  ];
  for (const key of keysInCode) {
    if (!(key in srcMessages) && predefined.indexOf(key) === -1) {
      missing.push(key);
      console.log(
        "\x1b[33m%s\x1b[0m",
        `SRC(${srcLocale}): "${key}" is missing`
      );
    }
  }
  console.log(
    unused.length + missing.length === 0
      ? "\x1b[32m%s\x1b[0m"
      : "\x1b[31m%s\x1b[0m",
    `SRC(${srcLocale}): ${missing.length} missing, ${unused.length} unused`
  );

  return { locale: srcLocale, missing, unused, messages: srcMessages };
}

async function check() {
  // eslint-disable-next-line no-undef
  process.chdir(path.dirname(import.meta.dirname));

  // ================= extract message keys from source code =================
  let keysInSource;
  try {
    keysInSource = await extractKeysFromSource();
  } catch (e) {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Error extracting keys from source code: " + e
    );
    return;
  }
  // ================= check canonical (source) locale =======================

  const { messages: srcMessages, locale: srcLocale } = await checkSourceLocale(
    keysInSource
  );

  // ================= check other locales =================

  const locales = (await readDirectory("./src/_locales")).filter(
    (a) => a !== srcLocale
  );
  for (const locale of locales) {
    const dstMessages = await readJSONFile(
      `./src/_locales/${locale}/messages.json`
    );
    let missing = 0;
    let untranslated = 0;
    let redundant = 0;
    let other = 0;
    for (const key in srcMessages) {
      if (!(key in dstMessages)) {
        missing++;
        console.log("\x1b[33m%s\x1b[0m", `${locale}: "${key}" is missing`);
      } else {
        if (
          dstMessages[key].message === srcMessages[key].message &&
          !(dstMessages[key].description?.indexOf("[keep-original]") >= 0)
        ) {
          untranslated++;
          console.log(
            "\x1b[33m%s\x1b[0m",
            `${locale}: "${key}" is untranslated`
          );
        } else if (
          dstMessages[key].description?.indexOf("[keep-original]") >= 0 &&
          dstMessages[key].message !== srcMessages[key].message
        ) {
          other++;
          console.log(
            "\x1b[33m%s\x1b[0m",
            `${locale}: "${key}" is marked as [keep-original] but different from the source`
          );
        }

        // check if number of placeholders is the same as source
        const dstPh = dstMessages[key].placeholders
          ? Object.keys(dstMessages[key].placeholders).length
          : 0;
        const srcPh = srcMessages[key].placeholders
          ? Object.keys(srcMessages[key].placeholders).length
          : 0;
        if (dstPh !== srcPh) {
          other++;
          console.log(
            "\x1b[33m%s\x1b[0m",
            `${locale}: "${key}" has ${dstPh} placeholder(s) but the source has ${srcPh}`
          );
        }
      }
    }
    for (const key in dstMessages) {
      if (!(key in srcMessages)) {
        redundant++;
        console.log("\x1b[33m%s\x1b[0m", `${locale}: "${key}" is redundant`);
      }
    }
    console.log(
      untranslated + missing + redundant + other === 0
        ? "\x1b[32m%s\x1b[0m"
        : "\x1b[31m%s\x1b[0m",
      `${locale}: ${missing} missing, ${untranslated} untranslated, ${redundant} redundant, ${other} other issues`
    );
  }
}

/**
 *
 * compared the current version and the specified version of `file`
 * extract any strings that have been added or changed since `sinceCommit`
 * and print them out as json
 * also show the number of strings that have been removed since in stderr
 * @param {*} file
 * @param {*} sinceCommit
 */
async function showChanges(file, sinceCommit) {
  // allow passing a directory
  if (!/\/messages\.json$/.test(file)) {
    file = path.join(file, "messages.json");
  }
  const currentFilePath = path.resolve(".", file);

  try {
    // get current file
    const currentFile = await readJSONFile(currentFilePath);

    // get old file directly from git show
    const oldFileContent = await util.promisify(exec)(
      `git show ${sinceCommit}:${file}`
    );
    const oldFile = JSON.parse(oldFileContent.stdout);

    // Check for added or changed keys
    const addedOrChanged = {};
    for (const key in currentFile) {
      if (!Object.prototype.hasOwnProperty.call(oldFile, key)) {
        addedOrChanged[key] = currentFile[key];
      } else if (
        JSON.stringify(currentFile[key]) !== JSON.stringify(oldFile[key])
      ) {
        addedOrChanged[key] = currentFile[key];
      }
    }

    console.log(JSON.stringify(addedOrChanged, null, 2));

    // Check for removed keys
    const removed = [];
    for (const key in oldFile) {
      if (!Object.prototype.hasOwnProperty.call(currentFile, key)) {
        removed.push(key);
      }
    }
    console.error(`Removed keys: ${removed.length}`);
  } catch (error) {
    console.error("Error in extractNew:", error);
  }
}

/**
 * Receive changed strings via stdin in JSON form and apply them to `file` in-place
 * Error if `file` has uncommited changes.
 * @param {string} file
 */
async function applyChanges(file) {
  // allow passing a directory
  if (!/\/messages\.json$/.test(file)) {
    file = path.join(file, "messages.json");
  }

  const currentFilePath = path.resolve(`./${file}`);

  try {
    // Check for uncommitted changes
    const gitStatus = await util.promisify(exec)(
      `git status --porcelain ${file}`
    );
    if (gitStatus.stdout.trim().length > 0) {
      throw new Error(
        `File ${file} has uncommitted changes. Please commit or stash before applying changes.`
      );
    }

    // Read current file content
    const currentFileContent = await readJSONFile(currentFilePath);

    // Read changes from stdin
    const stdinContent = await new Promise((resolve) => {
      let data = "";
      // eslint-disable-next-line no-undef
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      // eslint-disable-next-line no-undef
      process.stdin.on("end", () => {
        resolve(data);
      });
    });

    let changes;
    try {
      changes = JSON.parse(stdinContent);
    } catch (e) {
      throw new Error("Invalid JSON input: " + e);
    }

    // Apply changes
    const newFileContent = { ...currentFileContent };
    for (const key in changes) {
      newFileContent[key] = changes[key];
    }

    // Write back to file
    await fs.promises.writeFile(
      currentFilePath,
      JSON.stringify(newFileContent, null, 2) + "\n"
    );

    console.log(`Successfully applied changes to ${file}`);
  } catch (error) {
    console.error("Error applying changes:", error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

async function applyBatchChanges(dir) {
  // Read changes from stdin
  const stdinContent = await new Promise((resolve) => {
    let data = "";
    // eslint-disable-next-line no-undef
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    // eslint-disable-next-line no-undef
    process.stdin.on("end", () => {
      resolve(data);
    });
  });

  let changes;
  try {
    changes = JSON.parse(stdinContent);
  } catch (e) {
    throw new Error("Invalid JSON input: " + e);
  }

  const files = [];
  for (const locale in changes) {
    files.push(path.join(dir, locale, "messages.json"));
  }

  const nonexisting = [];
  for (const file of files) {
    try {
      await fs.promises.access(file);
    } catch {
      nonexisting.push(file);
    }
  }
  if (nonexisting.length > 0) {
    throw new Error(
      "The following files does not exist: \n" + nonexisting.join("\n")
    );
  }

  // Check for uncommitted changes
  await ensureCommited(files);

  for (const locale in changes) {
    try {
      const file = path.join(dir, locale, "messages.json");
      const currentFilePath = path.resolve(".", file);
      // Read current file content
      const currentFileContent = await readJSONFile(currentFilePath);

      // Apply changes
      const newFileContent = { ...currentFileContent };
      for (const key in changes[locale]) {
        newFileContent[key] = changes[locale][key];
      }

      // Write back to file
      await fs.promises.writeFile(
        currentFilePath,
        JSON.stringify(newFileContent, null, 2) + "\n"
      );

      console.log(`Successfully applied changes to ${file}`);
    } catch (error) {
      console.error("Error applying changes:", error);
    }
  }
}

async function removeUnused() {
  const { unused } = await checkSourceLocale(await extractKeysFromSource());
  const dir = "./src/_locales/";
  const locales = await readDirectory(dir);
  const files = locales.map((locale) =>
    path.join(dir, locale, "messages.json")
  );

  await ensureCommited(files);

  for (const file of files) {
    try {
      const currentFilePath = path.resolve(".", file);
      // Read current file content
      const currentFileContent = await readJSONFile(currentFilePath);

      // Apply changes
      const newFileContent = { ...currentFileContent };
      for (const key of unused) {
        delete newFileContent[key];
      }

      // Write back to file
      await fs.promises.writeFile(
        currentFilePath,
        JSON.stringify(newFileContent, null, 2) + "\n"
      );

      console.log(`Successfully applied changes to ${file}`);
    } catch (error) {
      console.error("Error applying changes:", error);
    }
  }
}

(async function main() {
  // eslint-disable-next-line no-undef
  const argv = process.argv;
  switch (argv[2]) {
    case "check":
      await check();
      break;
    case "show-changes": {
      const file = argv[3];
      const sinceCommit = argv[4];
      await showChanges(file, sinceCommit);
      break;
    }
    case "apply-changes": {
      const file = argv[3];
      await applyChanges(file);
      break;
    }
    case "apply-batch-changes": {
      const dir = argv[3];
      await applyBatchChanges(dir);
      break;
    }
    case "remove-unused": {
      await removeUnused();
      break;
    }
    default:
      {
        const node = argv[0].split("/").pop();
        const script = path.relative(".", argv[1]);
        // show usage
        console.log(`Usage:
        ${node} ${script} check
        ${node} ${script} show-changes <file> <sinceCommit>
        ${node} ${script} apply-changes <file>
        ${node} ${script} apply-batch-changes <dir>
        `);
      }
      break;
  }
})();
