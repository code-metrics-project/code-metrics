import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import pluginPrettier from "eslint-plugin-prettier";
import pluginCypress from "eslint-plugin-cypress/flat";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["./src/**/*.{js,mjs,cjs,ts,vue}", "!dist/**"] },
  { files: ["./src/**/*.js", "!dist/**"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["./src/**/*.vue", "!dist/**"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ["./src/**/*.{js,mjs,cjs,ts,vue}", "!dist/**"],
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  {
    files: ["__tests__/e2e/**/*.{js,ts}"],
    ...pluginCypress.configs.recommended,
  },
];
