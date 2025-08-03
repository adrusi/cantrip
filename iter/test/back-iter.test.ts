import { describe, test, expect } from "vitest"
import { BackIter } from "../src/iter"

import * as compat from "@cantrip/compat/iter"

function mkBackIter<A>(it: compat.BackSizeIterable<A>): BackIter<A> {
  const src = it[compat.ITERATOR]()

  return BackIter.from({
    [compat.IS_ITERATOR]: true,
    [compat.IS_BACK_ITERABLE]: true,

    next() {
      return src.next()
    },

    [compat.NEXT_BACK]() {
      return src[compat.NEXT_BACK]()
    },
  })
}

describe("BackIter", () => {
  describe("construction", () => {
    test("unsafeFrom - creates back iterator from back iterator", () => {
      const backIterator: compat.BackIterator<number> = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]() {
          return { done: true, value: undefined }
        },
        next() {
          return { done: true, value: undefined }
        },
      }

      const iter = BackIter.unsafeFrom(backIterator)
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
    })
  })

  describe("iterator protocol", () => {
    test("implements Symbol.iterator", () => {
      const iter = mkBackIter([])
      expect(iter[Symbol.iterator]).toBeDefined()
      expect(iter[Symbol.iterator]()).toBe(iter)
    })

    test("implements compat.ITERATOR", () => {
      const iter = mkBackIter([])
      expect(iter[compat.ITERATOR]).toBeDefined()
      expect(iter[compat.ITERATOR]()).toBe(iter)
    })

    test("has IS_BACK_ITERABLE symbol", () => {
      const iter = mkBackIter([])
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
    })

    test("implements NEXT_BACK", () => {
      const iter = mkBackIter([1, 2, 3])

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })

  describe("bidirectional iteration", () => {
    test("can iterate from both ends", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5])

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 5 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles empty iterator from both ends", () => {
      const iter = mkBackIter([])

      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles single element from both ends", () => {
      const iter = mkBackIter([42])

      expect(iter.next()).toEqual({ done: false, value: 42 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })

  describe("map", () => {
    test("maps values from front", () => {
      const iter = mkBackIter([1, 2, 3]).map((x) => x * 2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("maps values from back", () => {
      const iter = mkBackIter([1, 2, 3]).map((x) => x * 2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 6 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("maps values from both ends", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5]).map((x) => x * 2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 10 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 8 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = mkBackIter([1, 2, 3]).map((x) => x * 2)
      expect(iter.sizeBounds()).toEqual({ min: 0 })
    })
  })

  describe("flatMap", () => {
    test("flatMaps from front", () => {
      const iter = mkBackIter([1, 2]).flatMap((x) => mkBackIter([x, x + 10]))

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 11 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 12 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("flatMaps from back", () => {
      const iter = mkBackIter([1, 2]).flatMap((x) => mkBackIter([x, x + 10]))

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 12 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 11 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = mkBackIter([1, 2]).flatMap((x) => mkBackIter([x, x + 10]))
      expect(iter.sizeBounds()).toEqual({ min: 0 })
    })
  })

  describe("filter", () => {
    test("filters from front", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("filters from back", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("filters from both ends", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5, 6]).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0)
      expect(iter.sizeBounds()).toEqual({ min: 0 })
    })
  })

  describe("chain", () => {
    test("chains from front", () => {
      const iter1 = mkBackIter([1, 2])
      const iter2 = mkBackIter([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: false, value: 3 })
      expect(chained.next()).toEqual({ done: false, value: 4 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains from back", () => {
      const iter1 = mkBackIter([1, 2])
      const iter2 = mkBackIter([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(chained[compat.NEXT_BACK]()).toEqual({
        done: true,
        value: undefined,
      })
    })

    test("chains from both ends", () => {
      const iter1 = mkBackIter([1, 2])
      const iter2 = mkBackIter([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
      expect(chained[compat.NEXT_BACK]()).toEqual({
        done: true,
        value: undefined,
      })
    })

    test("chains with empty first iterator", () => {
      const iter1 = mkBackIter([])
      const iter2 = mkBackIter([1, 2])
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter1 = mkBackIter([1, 2])
      const iter2 = mkBackIter([3, 4])
      const chained = iter1.chain(iter2)
      expect(chained.sizeBounds()).toEqual({ min: 0 })
    })
  })

  describe("reversed", () => {
    test("reverses iteration order", () => {
      const iter = mkBackIter([1, 2, 3]).reversed()

      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("reverses back iteration", () => {
      const iter = mkBackIter([1, 2, 3]).reversed()

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles empty iterator", () => {
      const iter = mkBackIter([]).reversed()

      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = mkBackIter([1, 2, 3]).reversed()
      expect(iter.sizeBounds()).toEqual({ min: 0 })
    })
  })

  describe("method chaining", () => {
    test("chains multiple operations from front", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5, 6])
        .filter((x) => x % 2 === 0)
        .map((x) => x * 2)
        .reversed()

      expect(iter.next()).toEqual({ done: false, value: 12 })
      expect(iter.next()).toEqual({ done: false, value: 8 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("chains multiple operations from back", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5, 6])
        .filter((x) => x % 2 === 0)
        .map((x) => x * 2)
        .reversed()

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 8 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 12 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })

  describe("edge cases", () => {
    test("exhaustion from one end affects the other", () => {
      const iter = mkBackIter([1, 2, 3])

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })

      // Should also be exhausted from back
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("works with null and undefined values", () => {
      const iter = mkBackIter([null, undefined, 0])

      expect(iter.next()).toEqual({ done: false, value: null })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 0 })
      expect(iter.next()).toEqual({ done: false, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("meets in the middle", () => {
      const iter = mkBackIter([1, 2, 3, 4, 5])

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 5 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 3 })

      // Now both ends should be exhausted
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })
})
