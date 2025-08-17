import { describe, test, expect } from "vitest"
import { BitPartitionedTrieList } from "../../src/list/bit-partitioned-trie-list"
import type { ListP } from "../../src/types/list"
import { eq, hash } from "@cantrip/core"
import { Iter } from "@cantrip/iter"

describe("BitPartitionedTrieList", () => {
  describe("Construction", () => {
    test("empty list", () => {
      const empty = BitPartitionedTrieList.empty<number>()
      expect(empty.size()).toBe(0)
      expect([...empty]).toEqual([])
    })

    test("from iterable", () => {
      const list = BitPartitionedTrieList.from([1, 2, 3, 4, 5])
      expect(list.size()).toBe(5)
      expect([...list]).toEqual([1, 2, 3, 4, 5])
    })

    // test("from iterator", () => {
    //   const list = BitPartitionedTrieList.from(Iter.range(0, 5))
    //   expect(list.size()).toBe(5)
    //   expect([...list]).toEqual([0, 1, 2, 3, 4])
    // })

    test("of varargs", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      expect(list.size()).toBe(5)
      expect([...list]).toEqual([1, 2, 3, 4, 5])
    })

    test("from empty iterable", () => {
      const list = BitPartitionedTrieList.from([])
      expect(list.size()).toBe(0)
      expect([...list]).toEqual([])
    })
  })

  describe("Basic operations", () => {
    test("get on empty list throws", () => {
      const empty = BitPartitionedTrieList.empty<number>()
      expect(() => empty.get(0)).toThrow("Index out of bounds")
    })

    test("get with negative index throws", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.get(-1)).toThrow("Index out of bounds")
    })

    test("get with index >= size throws", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.get(3)).toThrow("Index out of bounds")
    })

    test("get valid indices", () => {
      const list = BitPartitionedTrieList.of("a", "b", "c", "d")
      expect(list.get(0)).toBe("a")
      expect(list.get(1)).toBe("b")
      expect(list.get(2)).toBe("c")
      expect(list.get(3)).toBe("d")
    })

    test("has method", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(list.has(0)).toBe(true)
      expect(list.has(1)).toBe(true)
      expect(list.has(2)).toBe(true)
      expect(list.has(3)).toBe(false)
      // expect(list.has(-1)).toBe(false)
    })

    test("size method", () => {
      expect(BitPartitionedTrieList.empty().size()).toBe(0)
      expect(BitPartitionedTrieList.of(1).size()).toBe(1)
      expect(BitPartitionedTrieList.of(1, 2, 3, 4, 5).size()).toBe(5)
    })
  })

  describe("conj operations", () => {
    test("conj to empty list", () => {
      const list = BitPartitionedTrieList.empty<number>().conj(42)
      expect(list.size()).toBe(1)
      expect(list.get(0)).toBe(42)
    })

    test("conj multiple items", () => {
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < 10; i++) {
        list = list.conj(i)
      }
      expect(list.size()).toBe(10)
      for (let i = 0; i < 10; i++) {
        expect(list.get(i)).toBe(i)
      }
    })

    test("conjMany with array", () => {
      const list = BitPartitionedTrieList.empty<number>().conjMany([
        1, 2, 3, 4, 5,
      ])
      expect(list.size()).toBe(5)
      expect([...list]).toEqual([1, 2, 3, 4, 5])
    })

    // test("conjMany with iterator", () => {
    //   const list = BitPartitionedTrieList.empty<number>().conjMany(
    //     Iter.range(0, 5),
    //   )
    //   expect(list.size()).toBe(5)
    //   expect([...list]).toEqual([0, 1, 2, 3, 4])
    // })

    test("conjMany preserves existing elements", () => {
      const base = BitPartitionedTrieList.of(1, 2, 3)
      const extended = base.conjMany([4, 5, 6])
      expect([...extended]).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe("Boundary conditions (branch factor = 32)", () => {
    test("fill exactly one branch", () => {
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < 32; i++) {
        list = list.conj(i)
      }
      expect(list.size()).toBe(32)
      for (let i = 0; i < 32; i++) {
        expect(list.get(i)).toBe(i)
      }
    })

    test("exceed one branch", () => {
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < 33; i++) {
        list = list.conj(i)
      }
      expect(list.size()).toBe(33)
      for (let i = 0; i < 33; i++) {
        expect(list.get(i)).toBe(i)
      }
    })

    test("fill multiple branches", () => {
      const n = 32 * 10 + 15 // Multiple full branches plus partial
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < n; i++) {
        list = list.conj(i)
      }
      expect(list.size()).toBe(n)
      for (let i = 0; i < n; i++) {
        expect(list.get(i)).toBe(i)
      }
    })

    test("very large list", () => {
      const n = 32 * 32 * 3 + 100 // Cross multiple trie levels
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < n; i++) {
        list = list.conj(i)
      }
      expect(list.size()).toBe(n)
      // Spot check various indices
      expect(list.get(0)).toBe(0)
      expect(list.get(31)).toBe(31)
      expect(list.get(32)).toBe(32)
      expect(list.get(1023)).toBe(1023)
      expect(list.get(1024)).toBe(1024)
      expect(list.get(n - 1)).toBe(n - 1)
    })
  })

  describe("assoc and update", () => {
    test("assoc on valid index", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const updated = list.assoc(2, 99)
      expect([...updated]).toEqual([1, 2, 99, 4, 5])
      expect([...list]).toEqual([1, 2, 3, 4, 5]) // Original unchanged
    })

    test("assoc on first index", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      const updated = list.assoc(0, 99)
      expect([...updated]).toEqual([99, 2, 3])
    })

    test("assoc on last index", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      const updated = list.assoc(2, 99)
      expect([...updated]).toEqual([1, 2, 99])
    })

    test("assoc throws on invalid index", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.assoc(-1, 99)).toThrow("Index out of bounds")
      expect(() => list.assoc(3, 99)).toThrow("Index out of bounds")
    })

    test("update with function", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const updated = list.update(2, (x) => x * 10)
      expect([...updated]).toEqual([1, 2, 30, 4, 5])
      expect([...list]).toEqual([1, 2, 3, 4, 5]) // Original unchanged
    })

    test("update throws on invalid index", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.update(-1, (x) => x * 2)).toThrow("Index out of bounds")
      expect(() => list.update(3, (x) => x * 2)).toThrow("Index out of bounds")
    })

    test("assoc/update across trie boundaries", () => {
      const n = 32 * 3 + 10
      let list = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < n; i++) {
        list = list.conj(i)
      }

      // Update elements in different parts of the trie
      const updated = list
        .assoc(0, -1) // First element
        .assoc(31, -31) // End of first branch
        .assoc(32, -32) // Start of second branch
        .assoc(63, -63) // End of second branch
        .assoc(64, -64) // Start of third branch
        .update(n - 1, (x) => -x) // Last element

      expect(updated.get(0)).toBe(-1)
      expect(updated.get(31)).toBe(-31)
      expect(updated.get(32)).toBe(-32)
      expect(updated.get(63)).toBe(-63)
      expect(updated.get(64)).toBe(-64)
      expect(updated.get(n - 1)).toBe(-(n - 1))

      // Check that other elements are unchanged
      expect(updated.get(1)).toBe(1)
      expect(updated.get(30)).toBe(30)
      expect(updated.get(33)).toBe(33)
    })
  })

  describe("slice operations", () => {
    test("slice empty list", () => {
      const empty = BitPartitionedTrieList.empty<number>()
      const sliced = empty.slice()
      expect(sliced.size()).toBe(0)
    })

    test("slice whole list", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const sliced = list.slice()
      expect([...sliced]).toEqual([1, 2, 3, 4, 5])
      expect(sliced).not.toBe(list) // Should be new instance
    })

    test("slice with start", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const sliced = list.slice(2)
      expect([...sliced]).toEqual([3, 4, 5])
    })

    test("slice with start and end", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const sliced = list.slice(1, 4)
      expect([...sliced]).toEqual([2, 3, 4])
    })

    test("slice with end only", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const sliced = list.slice(0, 3)
      expect([...sliced]).toEqual([1, 2, 3])
    })

    test("slice beyond bounds", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      const sliced = list.slice(1, 10)
      expect([...sliced]).toEqual([2, 3])
    })
  })

  describe("spliced operations", () => {
    test("splice remove elements", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const spliced = list.spliced(1, 2) // Remove elements at index 1, 2
      expect([...spliced]).toEqual([1, 4, 5])
    })

    test("splice insert elements", () => {
      const list = BitPartitionedTrieList.of(1, 2, 5)
      const spliced = list.spliced(2, 0, [3, 4]) // Insert at index 2
      expect([...spliced]).toEqual([1, 2, 3, 4, 5])
    })

    test("splice replace elements", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const spliced = list.spliced(1, 3, [99, 100]) // Replace 3 elements with 2
      expect([...spliced]).toEqual([1, 99, 100, 5])
    })

    test("splice at beginning", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      const spliced = list.spliced(0, 1, [99])
      expect([...spliced]).toEqual([99, 2, 3])
    })

    test("splice at end", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      const spliced = list.spliced(2, 1, [99])
      expect([...spliced]).toEqual([1, 2, 99])
    })
  })

  describe("Iteration", () => {
    test("forward iteration", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const result: number[] = []
      for (const x of list) {
        result.push(x)
      }
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    test("backward iteration", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const iter = list.iter()
      const result: number[] = []

      // Collect from back
      let next = iter.nextBack()
      while (!next.done) {
        result.push(next.value)
        next = iter.nextBack()
      }
      expect(result).toEqual([5, 4, 3, 2, 1])
    })

    test("mixed forward/backward iteration", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const iter = list.iter()

      expect(iter.next().value).toBe(1)
      expect(iter.nextBack().value).toBe(5)
      expect(iter.next().value).toBe(2)
      expect(iter.nextBack().value).toBe(4)
      expect(iter.next().value).toBe(3)
      expect(iter.next().done).toBe(true)
      expect(iter.nextBack().done).toBe(true)
    })

    test("entries iteration", () => {
      const list = BitPartitionedTrieList.of("a", "b", "c")
      const entries = [...list.entries()]
      expect(entries).toEqual([
        [0, "a"],
        [1, "b"],
        [2, "c"],
      ])
    })

    test("iteration size tracking", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const iter = list.iter()

      expect(iter.size()).toBe(5)
      iter.next()
      expect(iter.size()).toBe(4)
      iter.nextBack()
      expect(iter.size()).toBe(3)
      iter.next()
      expect(iter.size()).toBe(2)
    })
  })

  describe("Equality and hashing", () => {
    test("empty lists are equal", () => {
      const empty1 = BitPartitionedTrieList.empty<number>()
      const empty2 = BitPartitionedTrieList.empty<number>()
      expect(eq(empty1, empty2)).toBe(true)
    })

    test("lists with same elements are equal", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const list2 = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      expect(eq(list1, list2)).toBe(true)
    })

    test("lists with different elements are not equal", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = BitPartitionedTrieList.of(1, 2, 4)
      expect(eq(list1, list2)).toBe(false)
    })

    test("lists with different sizes are not equal", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = BitPartitionedTrieList.of(1, 2, 3, 4)
      expect(eq(list1, list2)).toBe(false)
    })

    test("list not equal to non-list", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(eq(list, [1, 2, 3])).toBe(false)
      expect(eq(list, null)).toBe(false)
      expect(eq(list, "123")).toBe(false)
    })

    test("equal lists have same hash", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const list2 = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      expect(hash(list1)).toBe(hash(list2))
    })

    test("structural sharing preserves identity", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = list1.conj(4)
      const list3 = list2.slice(0, 3) // Should reconstruct similar to list1

      expect(eq(list1, list3)).toBe(true)
      expect(list1).not.toBe(list3) // Different instances
    })
  })

  describe("Transient operations", () => {
    test("create transient from persistent", () => {
      const persistent = BitPartitionedTrieList.of(1, 2, 3)
      const transient = persistent.asTransient()
      expect(transient.size()).toBe(3)
      expect(transient.get(0)).toBe(1)
    })

    test("transient conj", () => {
      const persistent = BitPartitionedTrieList.of(1, 2, 3)
      const transient = persistent.asTransient()

      transient.conj(4)
      transient.conj(5)

      expect(transient.size()).toBe(5)
      expect(transient.get(3)).toBe(4)
      expect(transient.get(4)).toBe(5)
    })

    test("transient conjMany", () => {
      const transient = BitPartitionedTrieList.empty<number>().asTransient()
      transient.conjMany([1, 2, 3, 4, 5])

      expect(transient.size()).toBe(5)
      for (let i = 0; i < 5; i++) {
        expect(transient.get(i)).toBe(i + 1)
      }
    })

    test("transient update and assoc", () => {
      const transient = BitPartitionedTrieList.of(1, 2, 3, 4, 5).asTransient()

      transient.update(2, (x) => x * 10)
      transient.assoc(0, 99)

      expect(transient.get(0)).toBe(99)
      expect(transient.get(2)).toBe(30)
    })

    test("transient assocMany", () => {
      const transient = BitPartitionedTrieList.of(1, 2, 3, 4, 5).asTransient()
      transient.assocMany([
        [0, 99],
        [2, 88],
        [4, 77],
      ])

      expect(transient.get(0)).toBe(99)
      expect(transient.get(1)).toBe(2)
      expect(transient.get(2)).toBe(88)
      expect(transient.get(3)).toBe(4)
      expect(transient.get(4)).toBe(77)
    })

    test("commit transient to persistent", () => {
      const original = BitPartitionedTrieList.of(1, 2, 3)
      const transient = original.asTransient()

      transient.conj(4)
      transient.conj(5)
      transient.update(0, (x) => x * 10)

      const committed = transient.commit()

      expect(committed.size()).toBe(5)
      expect([...committed]).toEqual([10, 2, 3, 4, 5])
      expect([...original]).toEqual([1, 2, 3]) // Original unchanged
    })

    test("transient operations don't affect original", () => {
      const original = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const copy = BitPartitionedTrieList.of(1, 2, 3, 4, 5)
      const transient = original.asTransient()

      // Modify transient extensively
      for (let i = 0; i < 100; i++) {
        transient.conj(i + 10)
      }
      for (let i = 0; i < 5; i++) {
        transient.update(i, (x) => x * -1)
      }

      // Original should be unchanged
      expect(eq(original, copy)).toBe(true)
    })

    test("transient operations across trie boundaries", () => {
      const transient = BitPartitionedTrieList.empty<number>().asTransient()

      // Add enough elements to cross multiple trie levels
      const n = 32 * 32 + 100
      for (let i = 0; i < n; i++) {
        transient.conj(i)
      }

      const committed = transient.commit()
      expect(committed.size()).toBe(n)
      for (let i = 0; i < n; i++) {
        expect(committed.get(i)).toBe(i)
      }
    })

    test("transient equality and hashing", () => {
      const transient1 = BitPartitionedTrieList.of(1, 2, 3).asTransient()
      const transient2 = BitPartitionedTrieList.of(1, 2, 3).asTransient()

      // Transients use identity equality
      expect(eq(transient1, transient1)).toBe(true)
      expect(eq(transient1, transient2)).toBe(false)

      // Hash should be object hash, not content hash
      expect(hash(transient1)).not.toBe(hash(transient2))
    })

    test("transient slice and spliced throw", () => {
      const transient = BitPartitionedTrieList.of(1, 2, 3).asTransient()

      expect(() => transient.slice()).toThrow(
        "slice is not implemented on transients",
      )
      expect(() => transient.spliced(0, 1)).toThrow(
        "spliced is not implemented on transients",
      )
    })

    test("using transient after commit throws", () => {
      const transient = BitPartitionedTrieList.of(1, 2, 3).asTransient()
      transient.commit()

      expect(() => transient.conj(4)).toThrow("Transient used after .commit()")
      expect(() => transient.update(0, (x) => x * 2)).toThrow(
        "Transient used after .commit()",
      )
    })
  })

  describe("Immutability guarantees", () => {
    test("conj creates new instance", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = list1.conj(4)

      expect(list1).not.toBe(list2)
      expect(list1.size()).toBe(3)
      expect(list2.size()).toBe(4)
    })

    test("assoc creates new instance", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = list1.assoc(1, 99)

      expect(list1).not.toBe(list2)
      expect(list1.get(1)).toBe(2)
      expect(list2.get(1)).toBe(99)
    })

    test("update creates new instance", () => {
      const list1 = BitPartitionedTrieList.of(1, 2, 3)
      const list2 = list1.update(1, (x) => x * 10)

      expect(list1).not.toBe(list2)
      expect(list1.get(1)).toBe(2)
      expect(list2.get(1)).toBe(20)
    })

    test("structural modifications preserve unmodified parts", () => {
      // This test verifies that structural sharing works correctly
      const large = BitPartitionedTrieList.from(
        Array.from({ length: 1000 }, (_, i) => i),
      )
      const modified = large.assoc(500, -1)

      expect(modified.get(500)).toBe(-1)
      expect(large.get(500)).toBe(500)

      // Verify other elements are the same
      for (let i = 0; i < 1000; i++) {
        if (i !== 500) {
          expect(modified.get(i)).toBe(large.get(i))
        }
      }
    })
  })

  describe("Error handling", () => {
    test("constructor guard prevents direct instantiation", () => {
      expect(() => {
        // @ts-expect-error - testing private constructor
        new BitPartitionedTrieList(Symbol("wrong"), 0, 0, null, [])
      }).toThrow("Invalid invocation of BitPartitionedTrieList constructor")
    })

    test("get throws on out of bounds access", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.get(-1)).toThrow("Index out of bounds")
      expect(() => list.get(3)).toThrow("Index out of bounds")
      expect(() => list.get(100)).toThrow("Index out of bounds")
    })

    test("assoc throws on out of bounds", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.assoc(-1, 99)).toThrow("Index out of bounds")
      expect(() => list.assoc(3, 99)).toThrow("Index out of bounds")
    })

    test("update throws on out of bounds", () => {
      const list = BitPartitionedTrieList.of(1, 2, 3)
      expect(() => list.update(-1, (x) => x)).toThrow("Index out of bounds")
      expect(() => list.update(3, (x) => x)).toThrow("Index out of bounds")
    })
  })

  describe("Performance characteristics", () => {
    test("large list operations remain efficient", () => {
      const n = 100000
      let list = BitPartitionedTrieList.empty<number>()

      // Build large list - should be efficient due to structural sharing
      const start = Date.now()
      for (let i = 0; i < n; i++) {
        list = list.conj(i)
      }
      const buildTime = Date.now() - start

      expect(list.size()).toBe(n)
      expect(buildTime).toBeLessThan(1000) // Should complete in reasonable time

      // Random access should be efficient (O(log n))
      const accessStart = Date.now()
      for (let i = 0; i < 1000; i++) {
        const idx = Math.floor(Math.random() * n)
        expect(list.get(idx)).toBe(idx)
      }
      const accessTime = Date.now() - accessStart

      expect(accessTime).toBeLessThan(100) // Should be fast
    })

    test("transient operations are more efficient for bulk updates", () => {
      const n = 10000

      // Time persistent operations
      const persistentStart = performance.now()
      let persistentList = BitPartitionedTrieList.empty<number>()
      for (let i = 0; i < n; i++) {
        persistentList = persistentList.conj(i)
      }
      const persistentTime = performance.now() - persistentStart

      // Time transient operations
      const transientStart = performance.now()
      const transient = BitPartitionedTrieList.empty<number>().asTransient()
      for (let i = 0; i < n; i++) {
        transient.conj(i)
      }
      const transientList = transient.commit()
      const transientTime = performance.now() - transientStart

      expect(transientTime).toBeLessThan(persistentTime)
      expect(eq(persistentList, transientList)).toBe(true)
    })
  })
})
