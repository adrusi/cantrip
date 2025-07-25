import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["lib", "dist", "node_modules"],
    globals: true,
  },
  resolve: {
    alias: {
      // Allow importing from src using the package name
      "@cantrip/typescript-eslint-rule-await-all-promises": "./src/mod.ts",
    },
  },
})
