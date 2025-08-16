import { describe, test, expect } from "vitest"

import { HashArrayMappedTrieDict } from "../../src/dict/hash-array-mapped-trie-dict"
import { type Value, EQ, HASH } from "@cantrip/compat/core"
import { eq } from "@cantrip/core"

class ValueMock<A> implements Value {
  public readonly hashCode: number
  public readonly eqValue: A

  public constructor(eqValue: A, hashCode: number) {
    this.hashCode = hashCode
    this.eqValue = eqValue
  }

  public [EQ](other: unknown): boolean {
    if (
      !(
        typeof other === "object" &&
        other !== null &&
        other instanceof ValueMock
      )
    ) {
      return false
    }
    return eq(this.eqValue, other.eqValue)
  }

  public [HASH](): number {
    return this.hashCode
  }
}

describe("HashArrayMappedTrieDict", () => {
  test("idfk1", () => {
    const n = 32 * 32 * 2

    let xs: HashArrayMappedTrieDict<number, number> =
      HashArrayMappedTrieDict.empty(undefined)

    for (let i = 0; i < n; i++) {
      xs = xs.assoc(i, i)
    }

    for (let i = 0; i < n; i++) {
      expect(xs.get(i)).toEqual(i)
    }
  })
})
