import { defineConfig } from "vitest/config"

export default defineConfig({
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
  resolve: {
    alias: {
      "@cantrip/array": new URL("./array/src/mod.ts", import.meta.url).pathname,
      "@cantrip/babel-plugin-transform-scope": new URL(
        "./babel-plugin-transform-scope/src/mod.ts",
        import.meta.url,
      ).pathname,
      "@cantrip/compat": new URL("./compat/src/mod.ts", import.meta.url)
        .pathname,
      "@cantrip/error": new URL("./error/src/mod.ts", import.meta.url).pathname,
      "@cantrip/internal-util": new URL(
        "./internal-util/src/mod.ts",
        import.meta.url,
      ).pathname,
      "@cantrip/iter": new URL("./iter/src/mod.ts", import.meta.url).pathname,
      "@cantrip/scope": new URL("./scope/src/mod.ts", import.meta.url).pathname,
      "@cantrip/typelevel": new URL("./typelevel/src/mod.ts", import.meta.url)
        .pathname,
    },
  },
})
