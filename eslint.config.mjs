import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(["src/opencv/", "release/", "promo/", "scripts/", "opencv/", "dist/"]),
  {
    extends: fixupConfigRules(
      compat.extends(
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended"
      )
    ),

    languageOptions: {
      globals: {
        ...globals.browser,
        QRLITE_BROWSER: true,
      },

      ecmaVersion: 12,
      sourceType: "module",
    },

    rules: {
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": ["warn", { ignore: ["class"] }],
    },
  },
]);
