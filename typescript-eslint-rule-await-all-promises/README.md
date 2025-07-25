# @cantrip/typescript-eslint-rule-await-all-promises

A TypeScript ESLint rule that enforces all promises to be immediately awaited.
This rule is designed for trio-style structured concurrency patterns where
promises should not be allowed to float without being awaited.

## Rule Details

This rule requires that all expressions of type `Promise<T>` must be immediately
preceded by the `await` operator. Unlike the built-in `no-floating-promises`
rule which allows `.then()`, `.catch()`, and `void` operators, this rule is
stricter and only allows `await`.

### ❌ Incorrect

```typescript
async function example() {
  // Promise not awaited
  Promise.resolve(42)

  // Function call returning promise not awaited
  fetch("https://api.example.com")

  // Promise constructor not awaited
  new Promise((resolve) => resolve(true))

  // Variable assignment with unawaited promise
  const result = Promise.resolve("hello")

  // Promise in array
  const promises = [Promise.resolve(1), Promise.resolve(2)]

  // Promise in object
  const obj = {
    data: Promise.resolve("data"),
  }

  // Return statement with unawaited promise
  return Promise.resolve(123)
}
```

### ✅ Correct

```typescript
async function example() {
  // All promises are properly awaited
  await Promise.resolve(42)

  const response = await fetch("https://api.example.com")

  const result = await new Promise((resolve) => resolve(true))

  const value = await Promise.resolve("hello")

  // Properly awaited promises in arrays and objects
  const promises = [await Promise.resolve(1), await Promise.resolve(2)]

  const obj = {
    data: await Promise.resolve("data"),
  }

  return await Promise.resolve(123)

  // Non-promise values are ignored
  const number = 42
  const string = "hello"
  console.log("test")
}
```

## Rule Implementation

The rule works by:

1. **Type Checking**: Uses TypeScript's type checker to identify expressions
   that resolve to `Promise<T>` types
2. **AST Analysis**: Examines the parent node to determine if the promise
   expression is immediately awaited
3. **Auto-fixing**: Automatically inserts `await` before unawaited promise
   expressions
4. **Comprehensive Coverage**: Checks promises in various contexts including:
   - Expression statements
   - Variable declarations
   - Return statements
   - Array elements
   - Object properties
   - Conditional expressions
   - Assignment expressions

## Installation and Usage

This rule requires:

- `@typescript-eslint/parser` for parsing TypeScript
- `@typescript-eslint/utils` for rule utilities
- `ts-api-utils` for TypeScript type analysis

### ESLint Configuration

```typescript
import { awaitAllPromises } from "@cantrip/typescript-eslint-rule-await-all-promises"

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
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
```

## Development

### Testing

The rule includes comprehensive tests using `@typescript-eslint/rule-tester`:

```bash
npm test
```

### Manual Testing

A manual test is available to verify the rule structure:

```bash
npx jest test/manual.test.ts --verbose
```

## Integration with Structured Concurrency

This rule is designed to work with trio-style structured concurrency patterns
where:

- All async operations must be explicitly awaited
- No promises should be allowed to "float" or execute in the background
- The control flow should be explicit and structured

By enforcing immediate awaiting of all promises, this rule helps ensure that
async operations are properly coordinated within the structured concurrency
framework.

## Rule Metadata

- **Type**: `problem`
- **Fixable**: Yes (automatically inserts `await`)
- **Requires Type Checking**: Yes
- **Recommended**: For structured concurrency codebases

## License

This rule is part of the Cantrip structured concurrency toolkit.
