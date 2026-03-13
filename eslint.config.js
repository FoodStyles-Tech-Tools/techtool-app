const tsParser = require("@typescript-eslint/parser")
const tsPlugin = require("@typescript-eslint/eslint-plugin")
const reactPlugin = require("eslint-plugin-react")
const reactHooksPlugin = require("eslint-plugin-react-hooks")

module.exports = [
  {
    ignores: ["dist/**", "dist-backend/**", "node_modules/**", "*.config.js", "*.config.cjs"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    settings: {
      react: { version: "18" },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@server/*", "@/server/*", "**/server/*"],
              message: "Client code (src/) cannot import from server/.",
            },
            {
              group: ["@/lib/*", "@lib/*"],
              message: "The @lib alias is removed. Use @client/lib/, @server/lib/, or @shared/ instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@client/*", "@/src/*", "**/src/*"],
              message: "Server code cannot import from client (src/).",
            },
            {
              group: ["@/lib/*", "@lib/*"],
              message: "The @lib alias is removed. Use @server/lib/, @client/lib/, or @shared/ instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@client/*", "@/src/*", "**/src/*"],
              message: "Shared code cannot import from client (src/).",
            },
            {
              group: ["@server/*", "@/server/*", "**/server/*"],
              message: "Shared code cannot import from server/.",
            },
            {
              group: ["@/lib/*", "@lib/*"],
              message: "The @lib alias is removed. Use @shared/ for shared utilities.",
            },
          ],
        },
      ],
    },
  },
]
