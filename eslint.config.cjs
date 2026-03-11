"use strict"

const js = require("@eslint/js")
const tsPlugin = require("@typescript-eslint/eslint-plugin")
const tsParser = require("@typescript-eslint/parser")
const react = require("eslint-plugin-react")
const reactHooks = require("eslint-plugin-react-hooks")
const { browser, node } = require("globals")

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["dist/**", "dist-backend/**", "node_modules/**", "**/*.config.js", "**/*.config.cjs", "**/*.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...browser,
        ...node,
        React: "readonly",
        JSX: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "src/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/client/**/*.ts",
      "lib/auth-client.ts",
      "lib/config/client-env.ts",
      "lib/supabase-client.ts",
      "lib/supabase-browser.ts",
      "lib/lazy-component.ts",
      "lib/react-query.tsx",
      "lib/utils.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**", "**/server", "**/backend/**", "**/backend"],
              message:
                "Do not import server or backend code in client. Use the API or shared modules only.",
            },
            {
              group: [
                "**/lib/server/**",
                "**/lib/server",
                "**/lib/auth-helpers",
                "**/lib/auth",
                "**/lib/supabase",
                "**/lib/current-user",
                "**/lib/config/server-env*",
              ],
              message:
                "Do not import server-only lib in client. Use lib/client/* or shared modules.",
            },
          ],
        },
      ],
    },
  },
]
