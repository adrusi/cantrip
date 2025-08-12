import { describe, test, expect } from "vitest"

import { BitPartitionedTrieList } from "../../src/list/bit-partitioned-trie-list"
import type { ListP } from "../../src/types/list"
import { eq } from "@cantrip/core"

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

  test("idfk4", () => {
    const n = 32 * 32 * 2
    let xs: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()

    let xsT = xs.asTransient()

    for (let i = 0; i < n; i++) {
      xsT.conj(i)
    }

    xs = xsT.commit()

    for (let i = 0; i < n; i++) {
      expect(xs.get(i)).toBe(i)
    }
  })

  test("idfk5", () => {
    const n = 32 * 32 * 2
    let xs: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()

    let xsT = xs.asTransient()

    for (let i = 0; i < n; i++) {
      xsT.conj(i)
    }
    for (let i = 0; i < n; i += 42) {
      xsT.update(i, (x) => -x)
    }

    xs = xsT.commit()

    for (let i = 0; i < n; i++) {
      if (i % 42 === 0) {
        expect(xs.get(i)).toBe(-i)
      } else {
        expect(xs.get(i)).toBe(i)
      }
    }
  })

  describe("transients never mutate associated persistents", () => {
    test("transient conj never mutates associated persistents", () => {
      const n = 32 * 32 * 2
      let xs: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()
      let ys: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()

      for (let i = 0; i < n; i++) {
        xs = xs.conj(i)
        ys = ys.conj(i)
      }

      let xsT = xs.asTransient()

      for (let i = 0; i < n; i++) {
        xsT = xsT.conj(i)
      }

      expect(eq(xs, ys)).toBe(true)
    })

    test("transient update never mutates associated persistents", () => {
      const n = 32 * 32 * 2
      let xs: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()
      let ys: BitPartitionedTrieList<number> = BitPartitionedTrieList.empty()

      for (let i = 0; i < n; i++) {
        xs = xs.conj(i)
        ys = ys.conj(i)
      }

      let xsT = xs.asTransient()

      for (let i = 0; i < n; i++) {
        xsT = xsT.update(i, (x) => x * 2)
      }

      expect(eq(xs, ys)).toBe(true)
    })
  })
})
