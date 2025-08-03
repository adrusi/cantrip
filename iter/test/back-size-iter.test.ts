import { describe, test, expect } from "vitest"
import { BackSizeIter } from "../src/iter"

import * as compat from "@cantrip/compat/iter"

describe("BackSizeIter", () => {
  describe("construction", () => {
    test("unsafeFrom - creates back size iterator from back size iterator", () => {
      const backSizeIterator: compat.BackSizeIterator<number> = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]() {
          return { done: true, value: undefined }
        },
        [compat.SIZE]() {
          return 0
        },
        next() {
          return { done: true, value: undefined }
        },
      }

      const iter = BackSizeIter.unsafeFrom(backSizeIterator)
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
      expect(iter[compat.IS_SIZE_ITERABLE]).toBe(true)
    })
  })

  describe("iterator protocol", () => {
    test("implements Symbol.iterator", () => {
      const iter = BackSizeIter.from([])
      expect(iter[Symbol.iterator]).toBeDefined()
      expect(iter[Symbol.iterator]()).toBe(iter)
    })

    test("implements compat.ITERATOR", () => {
      const iter = BackSizeIter.from([])
      expect(iter[compat.ITERATOR]).toBeDefined()
      expect(iter[compat.ITERATOR]()).toBe(iter)
    })

    test("has IS_BACK_ITERABLE symbol", () => {
      const iter = BackSizeIter.from([])
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
    })

    test("has IS_SIZE_ITERABLE symbol", () => {
      const iter = BackSizeIter.from([])
      expect(iter[compat.IS_SIZE_ITERABLE]).toBe(true)
    })

    test("implements NEXT_BACK and SIZE", () => {
      const iter = BackSizeIter.from([1, 2, 3])

      expect(iter[compat.SIZE]()).toBe(3)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter[compat.SIZE]()).toBe(2)
    })
  })

  describe("bidirectional iteration with size tracking", () => {
    test("can iterate from both ends with accurate size", () => {
      const iter = BackSizeIter.from([1, 2, 3, 4, 5])

      expect(iter.size()).toBe(5)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(4)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 5 })
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles empty iterator", () => {
      const iter = BackSizeIter.from([])

      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("handles single element", () => {
      const iter = BackSizeIter.from([42])

      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 42 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("size bounds are exact", () => {
      const iter = BackSizeIter.from([1, 2, 3])
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })

      iter.next()
      expect(iter.sizeBounds()).toEqual({ min: 2, max: 2 })
    })
  })

  describe("map", () => {
    test("maps values from front with size tracking", () => {
      const iter = BackSizeIter.from([1, 2, 3]).map((x) => x * 2)

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("maps values from back with size tracking", () => {
      const iter = BackSizeIter.from([1, 2, 3]).map((x) => x * 2)

      expect(iter.size()).toBe(3)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 6 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(0)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("maps values from both ends", () => {
      const iter = BackSizeIter.from([1, 2, 3, 4, 5]).map((x) => x * 2)

      expect(iter.size()).toBe(5)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(4)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 10 })
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 8 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.size()).toBe(0)
    })

    test("preserves exact size bounds", () => {
      const iter = BackSizeIter.from([1, 2, 3]).map((x) => x * 2)
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })
    })
  })

  describe("chain", () => {
    test("chains from front with correct size", () => {
      const iter1 = BackSizeIter.from([1, 2])
      const iter2 = BackSizeIter.from([3, 4])
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

    test("chains from back with correct size", () => {
      const iter1 = BackSizeIter.from([1, 2])
      const iter2 = BackSizeIter.from([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(4)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(chained.size()).toBe(3)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(chained.size()).toBe(2)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(1)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(chained.size()).toBe(0)
      expect(chained[compat.NEXT_BACK]()).toEqual({
        done: true,
        value: undefined,
      })
    })

    test("chains from both ends with size tracking", () => {
      const iter1 = BackSizeIter.from([1, 2])
      const iter2 = BackSizeIter.from([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.size()).toBe(4)
      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.size()).toBe(3)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(1)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(chained.size()).toBe(0)
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves exact size bounds", () => {
      const iter1 = BackSizeIter.from([1, 2, 3])
      const iter2 = BackSizeIter.from([4, 5])
      const chained = iter1.chain(iter2)

      expect(chained.sizeBounds()).toEqual({ min: 5, max: 5 })
    })
  })

  describe("reversed", () => {
    test("reverses iteration order with size tracking", () => {
      const iter = BackSizeIter.from([1, 2, 3]).reversed()

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("reverses back iteration with size tracking", () => {
      const iter = BackSizeIter.from([1, 2, 3]).reversed()

      expect(iter.size()).toBe(3)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("preserves exact size bounds", () => {
      const iter = BackSizeIter.from([1, 2, 3]).reversed()
      expect(iter.sizeBounds()).toEqual({ min: 3, max: 3 })
    })
  })

  describe("method chaining", () => {
    test("chains available operations", () => {
      const iter1 = BackSizeIter.from([1, 2])
      const iter2 = BackSizeIter.from([3, 4])
      const chained = iter1
        .chain(iter2)
        .map((x) => x * 2)
        .reversed()

      expect(chained.size()).toBe(4)
      expect(chained.next()).toEqual({ done: false, value: 8 })
      expect(chained.size()).toBe(3)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(chained.size()).toBe(2)
      expect(chained.next()).toEqual({ done: false, value: 6 })
      expect(chained.size()).toBe(1)
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(chained.size()).toBe(0)
    })
  })

  describe("edge cases", () => {
    test("exhaustion from one end affects the other and size", () => {
      const iter = BackSizeIter.from([1, 2, 3])

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })

      // Should also be exhausted from back
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("works with null and undefined values", () => {
      const iter = BackSizeIter.from([null, undefined, 0])

      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: null })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 0 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("meets in the middle with accurate size", () => {
      const iter = BackSizeIter.from([1, 2, 3, 4, 5])

      expect(iter.size()).toBe(5)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(4)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 5 })
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)

      // Now both ends should be exhausted
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
      expect(iter.size()).toBe(0)
    })

    test("handles large sizes", () => {
      const largeSize = 1000000
      const iter = BackSizeIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        [compat.SIZE]: () => largeSize,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      })

      expect(iter.size()).toBe(largeSize)
      expect(iter.sizeBounds()).toEqual({ min: largeSize, max: largeSize })
    })

    test("size consistency after multiple calls", () => {
      const iter = BackSizeIter.from([1, 2])

      expect(iter.size()).toBe(2)
      expect(iter.size()).toBe(2) // Should be consistent

      iter.next()
      expect(iter.size()).toBe(1)
      expect(iter.size()).toBe(1) // Should be consistent

      iter.next()
      expect(iter.size()).toBe(0)
      expect(iter.size()).toBe(0) // Should be consistent
    })
  })
})
