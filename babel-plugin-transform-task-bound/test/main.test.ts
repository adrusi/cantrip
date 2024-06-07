import { expect, test } from "bun:test"

import babel from "@babel/core"
// @ts-expect-error
import ermSyntax from "@babel/plugin-syntax-explicit-resource-management"
import plugin from "../src/mod"

function transform(code: string): string | null | undefined {
  return babel.transform(code, { plugins: [plugin, ermSyntax] })?.code
}

test("meow", () => {
  expect(transform(`await meow;`)).toBe(`await Task.bound(meow);`)

  expect(transform(`await ayy(await lmao);`)).toBe(
    `await Task.bound(ayy(await Task.bound(lmao)));`,
  )

  expect(transform(`for await (const x of y) {}`)).toBe(
    `for await (const x of Task.bound(y)) {}`,
  )

  expect(transform(`for await (const x of await y) {}`)).toBe(
    `for await (const x of Task.bound(await Task.bound(y))) {}`,
  )

  expect(transform(`await using foo = bar;`)).toBe(
    `await using foo = Task.bound(bar);`,
  )
})
