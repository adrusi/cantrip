import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["*/src/**/*.test.ts", "*/test/**/*.test.ts", "*/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      "lib",
      ".direnv/**/*",
      "typescript-eslint-rule-await-all-promises/**/*", // Keep separate due to complex ESLint rule test setup
    ],
    globals: true,
  },
})
