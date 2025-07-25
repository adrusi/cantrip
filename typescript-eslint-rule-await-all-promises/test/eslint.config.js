import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import { awaitAllPromises } from "../src/rule.ts"

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
})

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "await-all-promises": {
        rules: {
          "await-all-promises": awaitAllPromises,
        },
      },
    },
    rules: {
      "await-all-promises/await-all-promises": "error",
    },
  },
]
