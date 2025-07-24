export default {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: [
    "<rootDir>/*/src/**/*.test.ts",
    "<rootDir>/*/test/**/*.test.ts",
    "<rootDir>/*/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "<rootDir>/*/src/**/*.ts",
    "!<rootDir>/*/src/**/*.test.ts",
    "!<rootDir>/*/src/**/*.d.ts",
  ],
  moduleNameMapper: {
    "^@cantrip/(.*)$": "<rootDir>/$1/src/mod.ts",
  },
  transform: {
    "^.+\\.(ts|js)$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(@cantrip)/)"],
  moduleFileExtensions: ["ts", "js", "json"],
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: [],
}
