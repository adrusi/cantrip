import { describe, test, expect } from "vitest"
import { SizeIter } from "../src/iter"

import * as compat from "@cantrip/compat/iter"

function mkSizeIter<A>(it: compat.BackSizeIterable<A>): SizeIter<A> {
  const src = it[compat.ITERATOR]()

  return SizeIter.from({
    [compat.IS_ITERATOR]: true,
    [compat.IS_SIZE_ITERABLE]: true,

    next() {
      return src.next()
    },

    [compat.SIZE]() {
      return src[compat.SIZE]()
    },
  })
}

describe("SizeIter", () => {
  describe("construction", () => {
    test("unsafeFrom - creates size iterator from size iterator", () => {
      const iter = mkSizeIter([1, 2, 3])
      expect(iter[compat.IS_SIZE_ITERABLE]).toBe(true)
      expect(iter[compat.SIZE]()).toBe(3)
    })
  })

  describe("iterator protocol", () => {
    test("implements Symbol.iterator", () => {
      const iter = mkSizeIter([])
      expect(iter[Symbol.iterator]).toBeDefined()
      expect(iter[Symbol.iterator]()).toBe(iter)
    })

    test("implements compat.ITERATOR", () => {
      const iter = mkSizeIter([])
      expect(iter[compat.ITERATOR]).toBeDefined()
      expect(iter[compat.ITERATOR]()).toBe(iter)
    })

    test("has IS_SIZE_ITERABLE symbol", () => {
      const iter = mkSizeIter([])
      expect(iter[compat.IS_SIZE_ITERABLE]).toBe(true)
    })

    test("implements SIZE", () => {
      const iter = mkSizeIter(new Array(42))
      expect(iter[compat.SIZE]()).toBe(42)
    })
  })

  describe("size tracking", () => {
    test("tracks size accurately", () => {
      const iter = mkSizeIter([1, 2, 3])

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("handles empty iterator", () => {
      const iter = mkSizeIter([])
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("size bounds match actual size", () => {
      const iter = mkSizeIter([1, 2, 3])
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })

      iter.next()
      expect(iter.sizeBounds()).toEqual({ min: 2, max: 2 })
    })
  })

  describe("map", () => {
    test("maps values while preserving size", () => {
      const iter = mkSizeIter([1, 2, 3]).map((x) => x * 2)

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("maps empty iterator", () => {
      const iter = mkSizeIter([]).map((x) => x * 2)
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves exact size bounds", () => {
      const iter = mkSizeIter([1, 2, 3]).map((x) => x * 2)
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })
    })
  })

  describe("take", () => {
    test("takes specified number of elements", () => {
      const iter = mkSizeIter([1, 2, 3, 4, 5]).take(3)

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("takes zero elements", () => {
      const iter = mkSizeIter([1, 2, 3]).take(0)
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("takes more than available", () => {
      const iter = mkSizeIter([1, 2]).take(5)
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds correctly", () => {
      const iter = mkSizeIter([1, 2, 3, 4, 5]).take(3)
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })

      const iter2 = mkSizeIter([1, 2]).take(5)
      expect(iter2.sizeBounds()).toEqual({ min: 2, max: 2 })
    })
  })

  describe("drop", () => {
    test("drops specified number of elements", () => {
      const iter = mkSizeIter([1, 2, 3, 4, 5]).drop(2)

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 5 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("drops zero elements", () => {
      const iter = mkSizeIter([1, 2, 3]).drop(0)
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
    })

    test("drops more than available", () => {
      const iter = mkSizeIter([1, 2]).drop(5)
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("drops all elements", () => {
      const iter = mkSizeIter([1, 2, 3]).drop(3)
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds correctly", () => {
      const iter = mkSizeIter([1, 2, 3, 4, 5]).drop(2)
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })

      const iter2 = mkSizeIter([1, 2]).drop(5)
      expect(iter2.sizeBounds()).toEqual({ min: 0, max: 0 })
    })
  })

  describe("chain", () => {
    test("chains iterators with correct size", () => {
      const iter1 = mkSizeIter([1, 2])
      const iter2 = mkSizeIter([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(4)
      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.size()).toBe(3)
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 3 })
      expect(chained.size()).toBe(1)
      expect(chained.next()).toEqual({ done: false, value: 4 })
      expect(chained.size()).toBe(0)
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains with empty first iterator", () => {
      const iter1 = mkSizeIter([])
      const iter2 = mkSizeIter([1, 2])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.size()).toBe(1)
    })

    test("chains with empty second iterator", () => {
      const iter1 = mkSizeIter([1, 2])
      const iter2 = mkSizeIter([])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.size()).toBe(1)
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(0)
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains empty iterators", () => {
      const iter1 = mkSizeIter([])
      const iter2 = mkSizeIter([])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(0)
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves exact size bounds", () => {
      const iter1 = mkSizeIter([1, 2, 3])
      const iter2 = mkSizeIter([4, 5])
      const chained = iter1.chain(iter2)

      expect(chained.sizeBounds()).toEqual({ min: 5, max: 5 })
    })
  })

  describe("method chaining", () => {
    test("chains multiple operations with size tracking", () => {
      const iter = mkSizeIter([1, 2, 3, 4, 5, 6])
        .drop(1)
        .take(3)
        .map((x) => x * 2)

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 8 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("complex chaining preserves size", () => {
      const iter1 = mkSizeIter([1, 2])
      const iter2 = mkSizeIter([3, 4, 5])
      const chained = iter1.chain(iter2).take(4).drop(1)

      expect(chained.size()).toBe(3)
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 3 })
      expect(chained.size()).toBe(1)
      expect(chained.next()).toEqual({ done: false, value: 4 })
      expect(chained.size()).toBe(0)
    })
  })

  describe("edge cases", () => {
    test("size remains accurate after exhaustion", () => {
      const iter = mkSizeIter([1, 2])

      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("works with null and undefined values", () => {
      const iter = mkSizeIter([null, undefined, 0])

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: null })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: undefined })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 0 })
      expect(iter.size()).toBe(0)
    })

    test("handles large sizes", () => {
      const largeSize = 1000000
      const iter = SizeIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        [compat.SIZE]: () => largeSize,
        next: () => ({ done: true, value: undefined }),
      })

      expect(iter.size()).toBe(largeSize)
      expect(iter.sizeBounds()).toEqual({ min: largeSize, max: largeSize })
    })

    test("take with zero preserves size functionality", () => {
      const iter = mkSizeIter([1, 2, 3]).take(0)
      expect(iter.size()).toBe(0)
      expect(iter.sizeBounds()).toEqual({ min: 0, max: 0 })
    })

    test("drop more than size results in zero size", () => {
      const iter = mkSizeIter([1, 2]).drop(10)
      expect(iter.size()).toBe(0)
      expect(iter.sizeBounds()).toEqual({ min: 0, max: 0 })
    })
  })
})
