import { describe, test, expect } from "vitest"
import { BackIter } from "../src/iter"
import * as compat from "@cantrip/compat/iter"

describe("BackIter", () => {
  describe("construction", () => {
    test("unsafeFrom - creates back iterator from back iterator", () => {
      const backIterator: compat.BackIterator<number> = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: function () {
          return { done: true, value: undefined }
        },
        next: function () {
          return { done: true, value: undefined }
        },
      }

      const iter = BackIter.unsafeFrom(backIterator)
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
    })
  })

  describe("iterator protocol", () => {
    test("implements Symbol.iterator", () => {
      const iter = BackIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      })
      expect(iter[Symbol.iterator]).toBeDefined()
      expect(iter[Symbol.iterator]()).toBe(iter)
    })

    test("implements compat.ITERATOR", () => {
      const iter = BackIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      })
      expect(iter[compat.ITERATOR]).toBeDefined()
      expect(iter[compat.ITERATOR]()).toBe(iter)
    })

    test("has IS_BACK_ITERABLE symbol", () => {
      const iter = BackIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      })
      expect(iter[compat.IS_BACK_ITERABLE]).toBe(true)
    })

    test("implements NEXT_BACK", () => {
      const values = [1, 2, 3]
      let frontIndex = 0
      let backIndex = values.length - 1

      const iter = BackIter.unsafeFrom({
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      })

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })

  describe("bidirectional iteration", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("can iterate from both ends", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      )

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 5 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles empty iterator from both ends", () => {
      const iter = BackIter.unsafeFrom(createBidirectionalIterator([]))

      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles single element from both ends", () => {
      const iter = BackIter.unsafeFrom(createBidirectionalIterator([42]))

      expect(iter.next()).toEqual({ done: false, value: 42 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })
  })

  describe("map", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("maps values from front", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).map((x) => x * 2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("maps values from back", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).map((x) => x * 2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 6 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("maps values from both ends", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      ).map((x) => x * 2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 10 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 8 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).map((x) => x * 2)
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("flatMap", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("flatMaps from front", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2]),
      ).flatMap((x) =>
        BackIter.unsafeFrom(createBidirectionalIterator([x, x + 10])),
      )

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 11 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 12 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("flatMaps from back", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2]),
      ).flatMap((x) =>
        BackIter.unsafeFrom(createBidirectionalIterator([x, x + 10])),
      )

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 12 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 11 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2]),
      ).flatMap((x) =>
        BackIter.unsafeFrom(createBidirectionalIterator([x, x + 10])),
      )
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("filter", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("filters from front", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      ).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("filters from back", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      ).filter((x) => x % 2 === 0)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("filters from both ends", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5, 6]),
      ).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      ).filter((x) => x % 2 === 0)
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("chain", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("chains from front", () => {
      const iter1 = BackIter.unsafeFrom(createBidirectionalIterator([1, 2]))
      const iter2 = BackIter.unsafeFrom(createBidirectionalIterator([3, 4]))
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: false, value: 3 })
      expect(chained.next()).toEqual({ done: false, value: 4 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains from back", () => {
      const iter1 = BackIter.unsafeFrom(createBidirectionalIterator([1, 2]))
      const iter2 = BackIter.unsafeFrom(createBidirectionalIterator([3, 4]))
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
      const iter1 = BackIter.unsafeFrom(createBidirectionalIterator([1, 2]))
      const iter2 = BackIter.unsafeFrom(createBidirectionalIterator([3, 4]))
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
      const iter1 = BackIter.unsafeFrom(createBidirectionalIterator([]))
      const iter2 = BackIter.unsafeFrom(createBidirectionalIterator([1, 2]))
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter1 = BackIter.unsafeFrom(createBidirectionalIterator([1, 2]))
      const iter2 = BackIter.unsafeFrom(createBidirectionalIterator([3, 4]))
      const chained = iter1.chain(iter2)
      expect(chained.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("reversed", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("reverses iteration order", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).reversed()

      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("reverses back iteration", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).reversed()

      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 2 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("handles empty iterator", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([]),
      ).reversed()

      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3]),
      ).reversed()
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("method chaining", () => {
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("chains multiple operations from front", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5, 6]),
      )
        .filter((x) => x % 2 === 0)
        .map((x) => x * 2)
        .reversed()

      expect(iter.next()).toEqual({ done: false, value: 12 })
      expect(iter.next()).toEqual({ done: false, value: 8 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("chains multiple operations from back", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5, 6]),
      )
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
    function createBidirectionalIterator(
      values: number[],
    ): compat.BackIterator<number> {
      let frontIndex = 0
      let backIndex = values.length - 1

      return {
        [compat.IS_ITERATOR]: true,
        next() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[frontIndex++] }
          }
          return { done: true, value: undefined }
        },
        [compat.NEXT_BACK]() {
          if (frontIndex <= backIndex) {
            return { done: false, value: values[backIndex--] }
          }
          return { done: true, value: undefined }
        },
      }
    }

    test("exhaustion from one end affects the other", () => {
      const iter = BackIter.unsafeFrom(createBidirectionalIterator([1, 2, 3]))

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })

      // Should also be exhausted from back
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: true, value: undefined })
    })

    test("works with null and undefined values", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([null, undefined, 0]),
      )

      expect(iter.next()).toEqual({ done: false, value: null })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 0 })
      expect(iter.next()).toEqual({ done: false, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("meets in the middle", () => {
      const iter = BackIter.unsafeFrom(
        createBidirectionalIterator([1, 2, 3, 4, 5]),
      )

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
