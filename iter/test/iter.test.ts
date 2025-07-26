import { describe, test, expect } from "vitest"
import { Iter, BackIter, SizeIter, BackSizeIter } from "../src/iter"
import * as compat from "@cantrip/compat/iter"

describe("Iter", () => {
  describe("construction", () => {
    test("from - creates iterator from iterable", () => {
      const iter = Iter.from([1, 2, 3])
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("from - handles empty iterable", () => {
      const iter = Iter.from([])
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("from - handles strings", () => {
      const iter = Iter.from("abc")
      expect(iter.next()).toEqual({ done: false, value: "a" })
      expect(iter.next()).toEqual({ done: false, value: "b" })
      expect(iter.next()).toEqual({ done: false, value: "c" })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("from - handles generators", () => {
      function* gen() {
        yield 1
        yield 2
        yield 3
      }
      const iter = Iter.from(gen())
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("from - handles compat iterables", () => {
      const compatIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          let i = 0
          return {
            [compat.IS_ITERATOR]: true as const,
            next() {
              if (i < 3) {
                return { done: false, value: ++i }
              }
              return { done: true, value: undefined }
            },
          }
        },
      }

      const iter = Iter.from(compatIterable)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("unsafeFrom - creates iterator from iterator", () => {
      const stdIter = [1, 2, 3][Symbol.iterator]()
      const iter = Iter.unsafeFrom(stdIter)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("wrap - wraps function returning iterator result", () => {
      let count = 0
      const iter = Iter.wrap(() => {
        if (count < 3) {
          return { done: false, value: ++count }
        }
        return { done: true, value: undefined }
      })

      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("of - creates iterator from values", () => {
      const iter = Iter.of(1, 2, 3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("of - handles single value", () => {
      const iter = Iter.of(42)
      expect(iter.next()).toEqual({ done: false, value: 42 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("of - handles no values", () => {
      const iter = Iter.of()
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("empty - creates empty iterator", () => {
      const iter = Iter.empty()
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })
  })

  describe("iterator protocol", () => {
    test("implements Symbol.iterator", () => {
      const iter = Iter.from([1, 2, 3])
      expect(iter[Symbol.iterator]).toBeDefined()
      expect(iter[Symbol.iterator]()).toBe(iter)
    })

    test("implements compat.ITERATOR", () => {
      const iter = Iter.from([1, 2, 3])
      expect(iter[compat.ITERATOR]).toBeDefined()
      expect(iter[compat.ITERATOR]()).toBe(iter)
    })

    test("has IS_ITERATOR symbol", () => {
      const iter = Iter.from([1, 2, 3])
      expect(iter[compat.IS_ITERATOR]).toBe(true)
    })

    test("return method", () => {
      const iter = Iter.from([1, 2, 3])
      const result = iter.return()
      expect(result).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("throw method", () => {
      const iter = Iter.from([1, 2, 3])
      const error = new Error("test error")
      expect(() => iter.throw(error)).toThrow(error)
    })
  })

  describe("map", () => {
    test("maps values", () => {
      const iter = Iter.from([1, 2, 3]).map((x) => x * 2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("maps empty iterator", () => {
      const iter = Iter.empty<number>().map((x) => x * 2)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = Iter.from([1, 2, 3]).map((x) => x * 2)
      expect(iter.sizeBounds()).toEqual({ lower: 3, upper: 3 })
    })
  })

  describe("flatMap", () => {
    test("flattens mapped iterators", () => {
      const iter = Iter.from([1, 2, 3]).flatMap((x) => Iter.from([x, x]))
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("handles empty inner iterators", () => {
      const iter = Iter.from([1, 2, 3]).flatMap((x) =>
        x === 2 ? Iter.empty() : Iter.from([x]),
      )
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("handles empty outer iterator", () => {
      const iter = Iter.empty<number>().flatMap((x) => Iter.from([x, x]))
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = Iter.from([1, 2, 3]).flatMap((x) => Iter.from([x, x]))
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: null })
    })
  })

  describe("filter", () => {
    test("filters values", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("filters all values", () => {
      const iter = Iter.from([1, 3, 5]).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("filters no values", () => {
      const iter = Iter.from([2, 4, 6]).filter((x) => x % 2 === 0)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 6 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("filters empty iterator", () => {
      const iter = Iter.empty<number>().filter((x) => x > 0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0)
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: 5 })
    })
  })

  describe("take", () => {
    test("takes specified number of elements", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).take(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("takes zero elements", () => {
      const iter = Iter.from([1, 2, 3]).take(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("takes more than available", () => {
      const iter = Iter.from([1, 2]).take(5)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("takes from empty iterator", () => {
      const iter = Iter.empty<number>().take(3)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).take(3)
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: 3 })
    })
  })

  describe("drop", () => {
    test("drops specified number of elements", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).drop(2)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 5 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("drops zero elements", () => {
      const iter = Iter.from([1, 2, 3]).drop(0)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("drops more than available", () => {
      const iter = Iter.from([1, 2]).drop(5)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("drops from empty iterator", () => {
      const iter = Iter.empty<number>().drop(3)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter = Iter.from([1, 2, 3, 4, 5]).drop(2)
      expect(iter.sizeBounds()).toEqual({ lower: 0, upper: 3 })
    })
  })

  describe("chain", () => {
    test("chains iterators", () => {
      const iter1 = Iter.from([1, 2])
      const iter2 = Iter.from([3, 4])
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: false, value: 3 })
      expect(chained.next()).toEqual({ done: false, value: 4 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains with empty first iterator", () => {
      const iter1 = Iter.empty<number>()
      const iter2 = Iter.from([1, 2])
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains with empty second iterator", () => {
      const iter1 = Iter.from([1, 2])
      const iter2 = Iter.empty<number>()
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: false, value: 1 })
      expect(chained.next()).toEqual({ done: false, value: 2 })
      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("chains empty iterators", () => {
      const iter1 = Iter.empty<number>()
      const iter2 = Iter.empty<number>()
      const chained = iter1.chain(iter2)

      expect(chained.next()).toEqual({ done: true, value: undefined })
    })

    test("preserves size bounds", () => {
      const iter1 = Iter.from([1, 2, 3])
      const iter2 = Iter.from([4, 5])
      const chained = iter1.chain(iter2)

      expect(chained.sizeBounds()).toEqual({ lower: 5, upper: 5 })
    })
  })

  describe("method chaining", () => {
    test("chains multiple operations", () => {
      const iter = Iter.from([1, 2, 3, 4, 5, 6])
        .filter((x) => x % 2 === 0)
        .map((x) => x * 2)
        .take(2)

      expect(iter.next()).toEqual({ done: false, value: 4 })
      expect(iter.next()).toEqual({ done: false, value: 8 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("complex chaining with flatMap", () => {
      const iter = Iter.from([1, 2, 3])
        .flatMap((x) => Iter.from([x, x + 10]))
        .filter((x) => x > 5)
        .map((x) => x.toString())

      expect(iter.next()).toEqual({ done: false, value: "11" })
      expect(iter.next()).toEqual({ done: false, value: "12" })
      expect(iter.next()).toEqual({ done: false, value: "13" })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })
  })

  describe("edge cases", () => {
    test("multiple calls to next after exhaustion", () => {
      const iter = Iter.from([1])
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("works with null and undefined values", () => {
      const iter = Iter.from([null, undefined, 0, false, ""])
      expect(iter.next()).toEqual({ done: false, value: null })
      expect(iter.next()).toEqual({ done: false, value: undefined })
      expect(iter.next()).toEqual({ done: false, value: 0 })
      expect(iter.next()).toEqual({ done: false, value: false })
      expect(iter.next()).toEqual({ done: false, value: "" })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("handles large numbers in take/drop", () => {
      const iter = Iter.from([1, 2, 3])
      expect(iter.take(Number.MAX_SAFE_INTEGER).next()).toEqual({
        done: false,
        value: 1,
      })

      const iter2 = Iter.from([1, 2, 3])
      expect(iter2.drop(Number.MAX_SAFE_INTEGER).next()).toEqual({
        done: true,
        value: undefined,
      })
    })
  })
})
