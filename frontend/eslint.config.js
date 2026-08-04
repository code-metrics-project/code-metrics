import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import a11yPlugin from "eslint-plugin-jsx-a11y";
import tailwindCanonicalPlugin from "eslint-plugin-tailwind-canonical-classes";
import tsEslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "**/__tests__/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2025,
      },
    },
    settings: {
      react: {
        version: "19",
      },
    },
  },
  ...tsEslint.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
      "jsx-a11y": a11yPlugin,
      "tailwind-canonical-classes": tailwindCanonicalPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...a11yPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "jsx-a11y/aria-role": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "preserve-caught-error": "off",
      "tailwind-canonical-classes/tailwind-canonical-classes": [
        "off",
        {
          cssPath: "./src/index.css",
        },
      ],
    },
  },
];
