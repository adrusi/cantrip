import { expect, test } from "bun:test"

import babel from "@babel/core"
// @ts-expect-error
import ermSyntax from "@babel/plugin-syntax-explicit-resource-management"
import plugin from "../src/mod"

function transform(code: string): string | null | undefined {
  return babel.transform(code, { plugins: [plugin, ermSyntax] })?.code
}

function dedent(
  strings: TemplateStringsArray,
  ..._interpolations: unknown[]
): string {
  if (1 !== strings.length) throw new Error("dedent templates not implemented")
  let s = strings[0]
  s = s.replace(/^[ \t]+|[ \t]+$/g, "")
  if (!s.startsWith("\n") || !s.endsWith("\n"))
    throw new Error("dedent string must start and end with a newline")
  s = s.replace(/^\n|\n$/g, "")
  const lines = s.split("\n").map((line) => `${line}\n`)
  if (lines.length === 0) return ""
  const indent = lines[0].match(/^[ \t]+/)![0]
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(indent)) {
      throw new Error(
        `each line in dedent string must be indented at least as much as the first line '${indent}'`,
      )
    }
    lines[i] = lines[i].slice(indent.length)
  }
  return lines.join("").replace(/\n$/, "")
}

test("meow", () => {
  expect(transform(`await meow;`)).toBe(dedent`
    import { Task as _Task } from "@cantrip/task";
    await _Task.bound(meow);
  `)

  expect(transform(`await ayy(await lmao);`)).toBe(dedent`
    import { Task as _Task } from "@cantrip/task";
    await _Task.bound(ayy(await _Task.bound(lmao)));
  `)

  expect(transform(`for await (const x of y) {}`)).toBe(dedent`
    import { Task as _Task } from "@cantrip/task";
    for await (const x of _Task.bound(y)) {}
  `)

  expect(transform(`for await (const x of await y) {}`)).toBe(dedent`
    import { Task as _Task } from "@cantrip/task";
    for await (const x of _Task.bound(await _Task.bound(y))) {}
  `)

  expect(transform(`await using foo = bar;`)).toBe(dedent`
    import { Task as _Task } from "@cantrip/task";
    await using foo = _Task.bound(bar);
  `)

  expect(
    transform(dedent`
      const _Task = "nope";
      await meow;
    `),
  ).toBe(dedent`
    import { Task as _Task2 } from "@cantrip/task";
    const _Task = "nope";
    await _Task2.bound(meow);
  `)

  expect(
    transform(dedent`
      await meow;
      async function ayy() {
        const _Task = "nope";
        await lmao;
      }
    `),
  ).toBe(dedent`
    import { Task as _Task2 } from "@cantrip/task";
    await _Task2.bound(meow);
    async function ayy() {
      const _Task = "nope";
      await _Task2.bound(lmao);
    }
  `)
})
