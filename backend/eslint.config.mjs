import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/mocks/**",
      "*.config.js",
      "*.config.mjs",
      "**/coverage-*/**",
      "config/validator/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "unused-imports": unusedImports,
    },
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // TODO: to be re-enforced soon!
      "@typescript-eslint/no-explicit-any": "off",
      // to enforce using type for object type definitions, can be type or interface
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      // Prevent direct console usage - use logger utilities instead
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Allow console in test files and logger utilities
  {
    files: ["**/__tests__/**", "**/logger/**"],
    rules: {
      "no-console": "off",
    },
  },
);
