import { describe, test, expect } from "vitest"

import { BitPartitionedTrieList } from "../../src/list/bit-partitioned-trie-list"
import type { ListP } from "../../src/types/list"

describe("BitPartitionedTrieList", () => {
  test("idfk1", () => {
    let xs: ListP<number> = BitPartitionedTrieList.empty()
    xs = xs.conj(0)
    expect(xs.get(0)).toBe(0)
  })

  test("idfk2", () => {
    let xs: ListP<number> = BitPartitionedTrieList.empty()
    xs = xs.conj(0)
    xs = xs.conj(1)
    expect(xs.get(0)).toBe(0)
    expect(xs.get(1)).toBe(1)
  })

  test("idfk3", () => {
    const n = 32 * 32 * 2
    let xs: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()

    for (let i = 0; i < n; i++) {
      xs = xs.conj(i)
    }
    for (let i = 0; i < n; i++) {
      expect(xs.get(i)).toBe(i)
    }
  })
})
