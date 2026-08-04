import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import pluginPrettier from "eslint-plugin-prettier";
import pluginCypress from "eslint-plugin-cypress";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "dist/**",
      "coverage-ui--e2e/**",
      "coverage-ui--unit/**",
      ".nyc_output/**",
      ".scannerwork/**",
      "node_modules/**",
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
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
    files: ["./src/**/*.{ts,vue}"],
    rules: {
      "no-undef": "off",
      "no-useless-escape": "off",
      "preserve-caught-error": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "vue/multi-word-component-names": "off",
      "vue/no-use-v-if-with-v-for": "off",
      "vue/require-v-for-key": "off",
      "vue/valid-v-for": "off",
      "vue/valid-v-slot": "off",
    },
  },
  {
    files: ["./volar.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: "readonly",
      },
    },
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
