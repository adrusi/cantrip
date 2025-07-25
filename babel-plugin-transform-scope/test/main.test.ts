import { expect, test } from "vitest"

import * as babel from "@babel/core"
// @ts-expect-error plugin doesnt provide type information
import ermSyntax from "@babel/plugin-syntax-explicit-resource-management"
import plugin from "../src/mod"

function transform(code: string): string | null | undefined {
  return babel.transformSync(code, {
    filename: "example.ts",
    plugins: [plugin, ermSyntax],
    sourceType: "module",
    configFile: false,
    babelrc: false,
  })?.code
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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const indent = /^[ \t]+/.exec(lines[0])![0]
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
    import { awaitHook as _awaitHook } from "@cantrip/scope";
    await _awaitHook(meow);
  `)

  expect(transform(`await ayy(await lmao);`)).toBe(dedent`
    import { awaitHook as _awaitHook } from "@cantrip/scope";
    await _awaitHook(ayy(await _awaitHook(lmao)));
  `)

  expect(transform(`for await (const x of y) {}`)).toBe(dedent`
    import { forAwaitHook as _forAwaitHook } from "@cantrip/scope";
    for await (const x of _forAwaitHook(y)) {}
  `)

  expect(transform(`for await (const x of await y) {}`)).toBe(dedent`
    import { forAwaitHook as _forAwaitHook, awaitHook as _awaitHook } from "@cantrip/scope";
    for await (const x of _forAwaitHook(await _awaitHook(y))) {}
  `)

  expect(transform(`await using foo = bar;`)).toBe(dedent`
    import { awaitUsingHook as _awaitUsingHook } from "@cantrip/scope";
    await using foo = _awaitUsingHook(bar);
  `)

  expect(
    transform(dedent`
      const _awaitHook = "nope";
      await meow;
    `),
  ).toBe(dedent`
    import { awaitHook as _awaitHook2 } from "@cantrip/scope";
    const _awaitHook = "nope";
    await _awaitHook2(meow);
  `)

  expect(
    transform(dedent`
      await meow;
      async function ayy() {
        const _awaitHook = "nope";
        await lmao;
      }
    `),
  ).toBe(dedent`
    import { awaitHook as _awaitHook2 } from "@cantrip/scope";
    await _awaitHook2(meow);
    async function ayy() {
      const _awaitHook = "nope";
      await _awaitHook2(lmao);
    }
  `)
})
