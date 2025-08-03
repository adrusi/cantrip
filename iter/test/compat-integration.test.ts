import { describe, test, expect } from "vitest"
import { Iter, BackIter, SizeIter, BackSizeIter } from "../src/iter"

import * as compat from "@cantrip/compat/iter"

describe("Compat Integration", () => {
  describe("symbol detection", () => {
    test("isStdIterable detects standard iterables", () => {
      expect(compat.isStdIterable([1, 2, 3])).toBe(true)
      expect(compat.isStdIterable("hello")).toBe(true)
      expect(compat.isStdIterable(new Set([1, 2, 3]))).toBe(true)
      expect(compat.isStdIterable(new Map([["a", 1]]))).toBe(true)
      expect(compat.isStdIterable({ a: 1 })).toBe(false)
      expect(compat.isStdIterable(null)).toBe(false)
      expect(compat.isStdIterable(undefined)).toBe(false)
    })

    test("isIterable detects compat iterables", () => {
      const compatIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            next: () => ({ done: true, value: undefined }),
          }
        },
      }

      expect(compat.isIterable(compatIterable)).toBe(true)
      expect(
        compat.isIterable(
          // eventually we're likely to be patching most standard iterables to be compat.Iterable, so we force it here
          Object.assign([1, 2, 3], { [compat.ITERATOR]: undefined }),
        ),
      ).toBe(false) // Standard iterable but no ITERATOR symbol
      expect(compat.isIterable({ a: 1 })).toBe(false)
    })

    test("isBackIterable detects back iterables", () => {
      const backIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
            next: () => ({ done: true, value: undefined }),
          }
        },
        [compat.IS_BACK_ITERABLE]: true,
      }

      expect(compat.isBackIterable(backIterable)).toBe(true)

      const regularIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            next: () => ({ done: true, value: undefined }),
          }
        },
      }

      expect(compat.isBackIterable(regularIterable)).toBe(false)
    })

    test("isSizeIterable detects size iterables", () => {
      const sizeIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            [compat.SIZE]: () => 5,
            next: () => ({ done: true, value: undefined }),
          }
        },
        [compat.IS_SIZE_ITERABLE]: true,
      }

      expect(compat.isSizeIterable(sizeIterable)).toBe(true)

      const regularIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            next: () => ({ done: true, value: undefined }),
          }
        },
      }

      expect(compat.isSizeIterable(regularIterable)).toBe(false)
    })

    test("isBackSizeIterable detects back size iterables", () => {
      const backSizeIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
            [compat.SIZE]: () => 5,
            next: () => ({ done: true, value: undefined }),
          }
        },
        [compat.IS_BACK_ITERABLE]: true,
        [compat.IS_SIZE_ITERABLE]: true,
      }

      expect(compat.isBackSizeIterable(backSizeIterable)).toBe(true)

      const backIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
            next: () => ({ done: true, value: undefined }),
          }
        },
        [compat.IS_BACK_ITERABLE]: true,
      }

      expect(compat.isBackSizeIterable(backIterable)).toBe(false)
    })
  })

  describe("iterator detection", () => {
    test("isStdIterator detects standard iterators", () => {
      const stdIter = [1, 2, 3][Symbol.iterator]()
      expect(compat.isStdIterator(stdIter)).toBe(true)
      expect(
        compat.isStdIterator({
          next: () => ({ done: true, value: undefined }),
        }),
      ).toBe(true)
      expect(compat.isStdIterator({ a: 1 })).toBe(false)
      expect(compat.isStdIterator(null)).toBe(false)
    })

    test("isIterator detects compat iterators", () => {
      const compatIter = {
        [compat.IS_ITERATOR]: true,
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isIterator(compatIter)).toBe(true)

      const stdIter = [1, 2, 3][Symbol.iterator]()
      expect(compat.isIterator(stdIter)).toBe(false) // No IS_ITERATOR symbol
    })

    test("isBackIterator detects back iterators", () => {
      const backIter = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isBackIterator(backIter)).toBe(true)

      const regularIter = {
        [compat.IS_ITERATOR]: true,
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isBackIterator(regularIter)).toBe(false)
    })

    test("isSizeIterator detects size iterators", () => {
      const sizeIter = {
        [compat.IS_ITERATOR]: true,
        [compat.SIZE]: () => 5,
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isSizeIterator(sizeIter)).toBe(true)

      const regularIter = {
        [compat.IS_ITERATOR]: true,
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isSizeIterator(regularIter)).toBe(false)
    })

    test("isBackSizeIterator detects back size iterators", () => {
      const backSizeIter = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        [compat.SIZE]: () => 5,
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isBackSizeIterator(backSizeIter)).toBe(true)

      const backIter = {
        [compat.IS_ITERATOR]: true,
        [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
        next: () => ({ done: true, value: undefined }),
      }

      expect(compat.isBackSizeIterator(backIter)).toBe(false)
    })
  })

  describe("third-party integration", () => {
    test("can monkey-patch third-party data structure for Iter", () => {
      class ThirdPartyList<T> {
        private readonly items: T[] = []

        public add(item: T): void {
          this.items.push(item)
        }

        // Monkey-patch compat integration
        public [Symbol.iterator](): Iterator<T> {
          let items = this.items
          let index = 0
          return {
            next(): IteratorResult<T> {
              if (index < items.length) {
                return { done: false, value: items[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public [compat.ITERATOR](): compat.Iterator<T> {
          let items = this.items
          let index = 0
          return {
            [compat.IS_ITERATOR]: true as const,
            next(): compat.IteratorResult<T> {
              if (index < items.length) {
                return { done: false, value: items[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        }
      }

      const list: ThirdPartyList<number> = new ThirdPartyList()
      list.add(1)
      list.add(2)
      list.add(3)

      expect(compat.isIterable(list)).toBe(true)

      const iter = Iter.from(list)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("can monkey-patch third-party data structure for BackIter", () => {
      class ThirdPartyDeque<T> {
        private readonly items: T[] = []

        public push(item: T): void {
          this.items.push(item)
        }

        // Monkey-patch compat integration for bidirectional iteration
        public [Symbol.iterator](): Iterator<T> {
          let items = this.items
          let frontIndex = 0
          let backIndex = this.items.length - 1
          return {
            next(): IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[frontIndex++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public [compat.ITERATOR](): compat.BackIterator<T> {
          let items = this.items
          let frontIndex = 0
          let backIndex = this.items.length - 1
          return {
            [compat.IS_ITERATOR]: true as const,
            [compat.NEXT_BACK](): compat.IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[backIndex--] }
              }
              return { done: true, value: undefined }
            },
            next(): compat.IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[frontIndex++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public readonly [compat.IS_BACK_ITERABLE] = true as const
      }

      const deque: ThirdPartyDeque<number> = new ThirdPartyDeque()
      deque.push(1)
      deque.push(2)
      deque.push(3)

      expect(compat.isBackIterable(deque)).toBe(true)

      const iter = BackIter.from(deque) as BackIter<number>
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("can monkey-patch third-party data structure for SizeIter", () => {
      class ThirdPartyArray<T> {
        private readonly items: T[] = []

        public push(item: T): void {
          this.items.push(item)
        }

        public get length(): number {
          return this.items.length
        }

        // Monkey-patch compat integration for size tracking
        public [Symbol.iterator](): Iterator<T> {
          let items = this.items
          let index = 0
          return {
            next(): IteratorResult<T> {
              if (index < items.length) {
                return { done: false, value: items[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public [compat.ITERATOR](): compat.SizeIterator<T> {
          let items = this.items
          let index = 0
          return {
            [compat.IS_ITERATOR]: true as const,
            [compat.SIZE](): number {
              return Math.max(0, items.length - index)
            },
            next(): compat.IteratorResult<T> {
              if (index < items.length) {
                return { done: false, value: items[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public readonly [compat.IS_SIZE_ITERABLE] = true as const
      }

      const array: ThirdPartyArray<number> = new ThirdPartyArray()
      array.push(1)
      array.push(2)
      array.push(3)

      expect(compat.isSizeIterable(array)).toBe(true)

      const iter = SizeIter.from(array) as SizeIter<number>
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })

    test("can monkey-patch third-party data structure for BackSizeIter", () => {
      class ThirdPartyVector<T> {
        private readonly items: T[] = []

        public push(item: T): void {
          this.items.push(item)
        }

        public get length(): number {
          return this.items.length
        }

        // Monkey-patch compat integration for bidirectional size tracking
        public [Symbol.iterator](): Iterator<T> {
          let items = this.items
          let frontIndex = 0
          let backIndex = this.items.length - 1
          return {
            next(): IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[frontIndex++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public [compat.ITERATOR](): compat.BackSizeIterator<T> {
          let items = this.items
          let frontIndex = 0
          let backIndex = this.items.length - 1
          return {
            [compat.IS_ITERATOR]: true as const,
            [compat.NEXT_BACK](): compat.IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[backIndex--] }
              }
              return { done: true, value: undefined }
            },
            [compat.SIZE]() {
              return Math.max(0, backIndex - frontIndex + 1)
            },
            next(): compat.IteratorResult<T> {
              if (frontIndex <= backIndex) {
                return { done: false, value: items[frontIndex++] }
              }
              return { done: true, value: undefined }
            },
          }
        }

        public readonly [compat.IS_BACK_ITERABLE] = true as const
        public readonly [compat.IS_SIZE_ITERABLE] = true as const
      }

      const vector: ThirdPartyVector<number> = new ThirdPartyVector()
      vector.push(1)
      vector.push(2)
      vector.push(3)

      expect(compat.isBackSizeIterable(vector)).toBe(true)

      const iter = BackSizeIter.from(vector) as BackSizeIter<number>
      expect(iter.size()).toBe(3)
      expect(iter.next()).toEqual({ done: false, value: 1 })
      expect(iter.size()).toBe(2)
      expect(iter[compat.NEXT_BACK]()).toEqual({ done: false, value: 3 })
      expect(iter.size()).toBe(1)
      expect(iter.next()).toEqual({ done: false, value: 2 })
      expect(iter.size()).toBe(0)
      expect(iter.next()).toEqual({ done: true, value: undefined })
    })
  })

  describe("iterator type detection and dispatch", () => {
    test("Iter.from dispatches to correct iterator type based on compat symbols", () => {
      // Regular iterable -> Iter
      const regularIterable = {
        [Symbol.iterator]() {
          return [1, 2, 3][Symbol.iterator]()
        },
      }
      const iter1 = Iter.from(regularIterable)
      expect(iter1).toBeInstanceOf(Iter)
      expect(iter1).not.toBeInstanceOf(BackIter)

      // Back iterable -> BackIter
      const backIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          let index = 0
          const values = [1, 2, 3]
          return {
            [compat.IS_ITERATOR]: true,
            [compat.NEXT_BACK]: () => ({ done: true, value: undefined }),
            next: () => {
              if (index < values.length) {
                return { done: false, value: values[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        },
        [compat.IS_BACK_ITERABLE]: true,
      }
      const iter2 = Iter.from(backIterable)
      expect(iter2).toBeInstanceOf(BackIter)

      // Size iterable -> SizeIter
      const sizeIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          let index = 0
          const values = [1, 2, 3]
          return {
            [compat.IS_ITERATOR]: true,
            [compat.SIZE]: () => Math.max(0, values.length - index),
            next: () => {
              if (index < values.length) {
                return { done: false, value: values[index++] }
              }
              return { done: true, value: undefined }
            },
          }
        },
        [compat.IS_SIZE_ITERABLE]: true,
      }
      const iter3 = Iter.from(sizeIterable)
      expect(iter3).toBeInstanceOf(SizeIter)

      // Back size iterable -> BackSizeIter
      const backSizeIterable = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          let frontIndex = 0
          let backIndex = 2
          const values = [1, 2, 3]
          return {
            [compat.IS_ITERATOR]: true,
            [compat.NEXT_BACK]: () => {
              if (frontIndex <= backIndex) {
                return { done: false, value: values[backIndex--] }
              }
              return { done: true, value: undefined }
            },
            [compat.SIZE]: () => Math.max(0, backIndex - frontIndex + 1),
            next: () => {
              if (frontIndex <= backIndex) {
                return { done: false, value: values[frontIndex++] }
              }
              return { done: true, value: undefined }
            },
          }
        },
        [compat.IS_BACK_ITERABLE]: true,
        [compat.IS_SIZE_ITERABLE]: true,
      }
      const iter4 = Iter.from(backSizeIterable)
      expect(iter4).toBeInstanceOf(BackSizeIter)
    })
  })

  describe("symbol constants", () => {
    test("all expected symbols are defined", () => {
      expect(typeof compat.ITERATOR).toBe("symbol")
      expect(typeof compat.IS_ITERATOR).toBe("symbol")
      expect(typeof compat.IS_BACK_ITERABLE).toBe("symbol")
      expect(typeof compat.IS_SIZE_ITERABLE).toBe("symbol")
      expect(typeof compat.NEXT_BACK).toBe("symbol")
      expect(typeof compat.SIZE).toBe("symbol")
    })

    test("symbols are unique", () => {
      const symbols = [
        compat.ITERATOR,
        compat.IS_ITERATOR,
        compat.IS_BACK_ITERABLE,
        compat.IS_SIZE_ITERABLE,
        compat.NEXT_BACK,
        compat.SIZE,
      ]

      const uniqueSymbols = new Set(symbols)
      expect(uniqueSymbols.size).toBe(symbols.length)
    })

    test("symbols have descriptive string representations", () => {
      expect(compat.ITERATOR.toString()).toContain("ITERATOR")
      expect(compat.IS_ITERATOR.toString()).toContain("IS_ITERATOR")
      expect(compat.IS_BACK_ITERABLE.toString()).toContain("IS_BACK_ITERABLE")
      expect(compat.IS_SIZE_ITERABLE.toString()).toContain("IS_SIZE_ITERABLE")
      expect(compat.NEXT_BACK.toString()).toContain("NEXT_BACK")
      expect(compat.SIZE.toString()).toContain("SIZE")
    })
  })

  describe("edge cases", () => {
    test("handles objects with partial compat symbol implementation", () => {
      const partialCompat = {
        [Symbol.iterator]() {
          return this[compat.ITERATOR]()
        },
        [compat.ITERATOR]() {
          return {
            [compat.IS_ITERATOR]: true,
            next: () => ({ done: true, value: undefined }),
          }
        },
        // Has back iterable marker but iterator doesn't implement NEXT_BACK
        [compat.IS_BACK_ITERABLE]: true,
      }

      // Should detect as back iterable based on marker
      expect(compat.isBackIterable(partialCompat)).toBe(true)

      // But the actual iterator should not be detected as back iterator
      const iterator = partialCompat[compat.ITERATOR]()
      expect(compat.isBackIterator(iterator)).toBe(false)
    })

    test("handles null and undefined gracefully", () => {
      expect(compat.isIterable(null)).toBe(false)
      expect(compat.isIterable(undefined)).toBe(false)
      expect(compat.isBackIterable(null)).toBe(false)
      expect(compat.isBackIterable(undefined)).toBe(false)
      expect(compat.isSizeIterable(null)).toBe(false)
      expect(compat.isSizeIterable(undefined)).toBe(false)

      expect(compat.isIterator(null)).toBe(false)
      expect(compat.isIterator(undefined)).toBe(false)
      expect(compat.isBackIterator(null)).toBe(false)
      expect(compat.isBackIterator(undefined)).toBe(false)
      expect(compat.isSizeIterator(null)).toBe(false)
      expect(compat.isSizeIterator(undefined)).toBe(false)
    })
  })
})
