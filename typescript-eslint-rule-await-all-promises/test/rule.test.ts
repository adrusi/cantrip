import path from "node:path"
import { RuleTester } from "@typescript-eslint/rule-tester"
import tseslint from "typescript-eslint"

import * as vitest from "vitest"

import { rule as awaitAllPromises } from "../src/mod"

RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts*"],
        defaultProject: "test/test-tsconfig.json",
      },
      tsconfigRootDir: path.join(__dirname, ".."),
    },
  },
})

ruleTester.run("await-all-promises", awaitAllPromises, {
  valid: [
    // Properly awaited promises
    {
      code: `
        async function test() {
          await Promise.resolve(42);
        }
      `,
    },
    {
      code: `
        async function test() {
          const result = await fetch('https://example.com');
        }
      `,
    },
    {
      code: `
        async function test() {
          const promise = await new Promise(resolve => resolve(true));
        }
      `,
    },
    {
      code: `
        async function test() {
          return await Promise.resolve(123);
        }
      `,
    },
    // Non-promise values should be ignored
    {
      code: `
        function test() {
          const number = 42;
          const string = 'hello';
          console.log('test');
        }
      `,
    },
    // Awaited promises in complex expressions
    {
      code: `
        async function test() {
          const promises = [await Promise.resolve(1), await Promise.resolve(2)];
        }
      `,
    },
    {
      code: `
        async function test() {
          const obj = {
            data: await Promise.resolve('data')
          };
        }
      `,
    },
  ],
  invalid: [
    // Simple unawaited promise
    {
      code: `
        async function test() {
          Promise.resolve(42);
        }
      `,
      errors: [
        {
          messageId: "awaitAllPromises",
          line: 3,
          column: 11,
        },
      ],
      output: `
        async function test() {
          await Promise.resolve(42);
        }
      `,
    },
    // Variable assignment with unawaited promise
    {
      code: `
        async function test() {
          const result = Promise.resolve('hello');
        }
      `,
      errors: [
        {
          messageId: "awaitAllPromises",
          line: 3,
          column: 26,
        },
      ],
      output: `
        async function test() {
          const result = await Promise.resolve('hello');
        }
      `,
    },
    // Return statement with unawaited promise
    {
      code: `
        async function test() {
          return Promise.resolve(123);
        }
      `,
      errors: [
        {
          messageId: "awaitAllPromises",
          line: 3,
          column: 18,
        },
      ],
      output: `
        async function test() {
          return await Promise.resolve(123);
        }
      `,
    },
    // Promise in array
    {
      code: `
        async function test() {
          const promises = [Promise.resolve(1), Promise.resolve(2)];
        }
      `,
      errors: [
        {
          messageId: "awaitAllPromises",
          line: 3,
          column: 29,
        },
        {
          messageId: "awaitAllPromises",
          line: 3,
          column: 49,
        },
      ],
      output: `
        async function test() {
          const promises = [await Promise.resolve(1), await Promise.resolve(2)];
        }
      `,
    },
    // Promise in object
    {
      code: `
        async function test() {
          const obj = {
            data: Promise.resolve('data')
          };
        }
      `,
      errors: [
        {
          messageId: "awaitAllPromises",
          line: 4,
          column: 19,
        },
      ],
      output: `
        async function test() {
          const obj = {
            data: await Promise.resolve('data')
          };
        }
      `,
    },
  ],
})
