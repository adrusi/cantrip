import "./patch-std"

import * as compat from "@cantrip/compat/iter"
import { ArgumentError } from "@cantrip/error"

type SizeBounds = {
  readonly min: number
  readonly max?: number
}

export type IterableOrIterator<A> =
  | Iterable<A>
  | Iterator<A>
  | compat.Iterable<A>

export type IterFromReturn<It extends IterableOrIterator<unknown>> = It extends
  | compat.BackSizeIterable<infer A>
  | compat.BackSizeIterator<infer A>
  ? BackSizeIter<A>
  : It extends compat.SizeIterable<infer A> | compat.SizeIterator<infer A>
    ? SizeIter<A>
    : It extends compat.BackIterable<infer A> | compat.BackIterator<infer A>
      ? BackIter<A>
      : It extends Iterable<infer A> | Iterator<infer A>
        ? Iter<A>
        : never

function asIterator<A>(src: IterableOrIterator<A>): Iterator<A> {
  if (compat.isIterable(src)) return src[compat.ITERATOR]()
  if (compat.isStdIterable(src)) return src[Symbol.iterator]()
  return src
}

export abstract class Iter<A>
  implements compat.Iterable<A>, compat.Iterator<A>
{
  [Symbol.iterator](): Iter<A> {
    return this
  }
  abstract next(): compat.IteratorResult<A>
  return(value?: unknown): { done: true; value: undefined } {
    return { done: true, value: undefined }
  }
  throw(e?: any): { done: true; value: undefined } {
    return { done: true, value: undefined }
  }

  [compat.ITERATOR](): Iter<A> {
    return this
  }
  get [compat.IS_ITERATOR](): true {
    return true
  }

  static from<const It extends IterableOrIterator<unknown>>(
    it: It,
  ): IterFromReturn<It>
  static from(it: IterableOrIterator<unknown>): Iter<unknown> {
    // TODO this has a lot of redundant checks, and is worth optimizing
    if (compat.isBackSizeIterator(it)) {
      return BackSizeIter.unsafeFrom(it)
    } else if (compat.isBackSizeIterable(it)) {
      return BackSizeIter.unsafeFrom(it[compat.ITERATOR]())
    } else if (compat.isBackIterator(it)) {
      return BackIter.unsafeFrom(it)
    } else if (compat.isBackIterable(it)) {
      return BackIter.unsafeFrom(it[compat.ITERATOR]())
    } else if (compat.isSizeIterator(it)) {
      return SizeIter.unsafeFrom(it)
    } else if (compat.isSizeIterable(it)) {
      return SizeIter.unsafeFrom(it[compat.ITERATOR]())
    } else if (compat.isIterator(it)) {
      return Iter.unsafeFrom(it)
    } else if (compat.isIterable(it)) {
      return Iter.unsafeFrom(it[compat.ITERATOR]())
    } else if (compat.isStdIterator(it)) {
      return Iter.wrap(it)
    } else if (compat.isStdIterable(it)) {
      return Iter.wrap(it[Symbol.iterator]())
    } else {
      throw new ArgumentError("Iter.from expects an iterable or iterator")
    }
  }

  static unsafeFrom<A>(it: compat.Iterator<A>): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: compat.Iterator<A>

      constructor(src: compat.Iterator<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })(it)
  }

  static wrap<A>(it: Iterator<A>): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iterator<A>
      #done: boolean

      constructor(src: Iterator<A>) {
        super()
        this.#src = src
        this.#done = false
      }

      next(): compat.IteratorResult<A> {
        if (this.#done) return { done: true, value: undefined }

        let { done, value } = this.#src.next()
        if (done) {
          this.#done = true
          return { done: true, value: undefined }
        }

        return { done: false, value }
      }

      sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })(it)
  }

  static of<A>(...values: A[]): BackSizeIter<A> {
    return Iter.from(values)
  }

  static empty<A>(): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      next(): compat.IteratorResult<A> {
        return { done: true, value: undefined }
      }
      nextBack(): compat.IteratorResult<A> {
        return { done: true, value: undefined }
      }
      size(): number {
        return 0
      }
    })()
  }

  map<B>(f: (a: A) => B): Iter<B> {
    return new (class extends Iter<B> {
      readonly #src: Iter<A>

      constructor(src: Iter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      sizeBounds(): SizeBounds {
        return this.#src.sizeBounds()
      }
    })(this)
  }

  flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    return new (class extends Iter<B> {
      readonly #aSrc: Iter<A>
      #bSrc: Iterator<B> | null

      constructor(src: Iter<A>) {
        super()
        this.#aSrc = src
        this.#bSrc = null
      }

      next(): compat.IteratorResult<B> {
        while (true) {
          if (this.#bSrc === null) {
            const { done, value } = this.#aSrc.next()
            if (done) return { done: true, value: undefined }

            this.#bSrc = asIterator(f(value))
          }

          const { done, value } = this.#bSrc.next()
          if (done) continue

          return { done: false, value }
        }
      }

      sizeBounds(): SizeBounds {
        let { min } = this.#aSrc.sizeBounds()
        return { min }
      }
    })(this)
  }

  filter(f: (a: A) => boolean): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>

      constructor(src: Iter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.next()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value: value }
        }
      }

      sizeBounds(): SizeBounds {
        let { max } = this.#src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  take(n: number): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>
      #remaining: number

      constructor(src: Iter<A>) {
        super()
        this.#src = src
        this.#remaining = n
      }

      next(): compat.IteratorResult<A> {
        if (this.#remaining <= 0) return { done: true, value: undefined }
        this.#remaining -= 1

        const { done, value } = this.#src.next()
        if (done) {
          this.#remaining = 0
          return { done: true, value: undefined }
        }

        return { done, value }
      }

      sizeBounds(): SizeBounds {
        let { min, max } = this.#src.sizeBounds()
        return {
          min: Math.min(min, this.#remaining),
          max:
            max === undefined ? undefined : Math.max(max ?? 0, this.#remaining),
        }
      }
    })(this)
  }

  drop(n: number): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>
      #hasDropped: boolean

      constructor(src: Iter<A>) {
        super()
        this.#src = src
        this.#hasDropped = false
      }

      next(): compat.IteratorResult<A> {
        if (!this.#hasDropped) {
          for (let i = 0; i < n; i++) {
            const { done } = this.#src.next()
            if (done) {
              this.#hasDropped = true
              return { done: true, value: undefined }
            }
          }

          this.#hasDropped = true
        }

        return this.#src.next()
      }

      sizeBounds(): SizeBounds {
        if (this.#hasDropped) return this.#src.sizeBounds()
        let { min, max } = this.#src.sizeBounds()
        return {
          min: Math.max(min - n, 0),
          max: max === undefined ? undefined : Math.max(max - n, 0),
        }
      }
    })(this)
  }

  chain<B>(bs: IterableOrIterator<B>): Iter<A | B> {
    return new (class extends Iter<A | B> {
      #src: Iter<A> | Iter<B>
      #nextSrc: Iter<B> | null

      constructor(aSrc: Iter<A>, bSrc: Iter<B>) {
        super()
        this.#src = aSrc
        this.#nextSrc = bSrc
      }

      next(): compat.IteratorResult<A | B> {
        const { done, value } = this.#src.next()
        if (done) {
          if (this.#nextSrc) {
            this.#src = this.#nextSrc
            this.#nextSrc = null
            return this.next()
          }

          return { done: true, value: undefined }
        }

        return { done: false, value: value }
      }

      sizeBounds(): SizeBounds {
        if (!this.#nextSrc) return this.#src.sizeBounds()

        let { min: aMin, max: aMax } = this.#src.sizeBounds()
        let { min: bMin, max: bMax } = this.#nextSrc.sizeBounds()
        return {
          min: aMin + bMin,
          max:
            aMax === undefined || bMax === undefined ? undefined : aMax + bMax,
        }
      }
    })(this, Iter.from(bs))
  }

  abstract sizeBounds(): SizeBounds
}

export abstract class BackIter<A>
  extends Iter<A>
  implements compat.BackIterable<A>, compat.BackIterator<A>
{
  [Symbol.iterator](): BackIter<A> {
    return this
  }

  [compat.ITERATOR](): BackIter<A> {
    return this
  }
  get [compat.IS_BACK_ITERABLE](): true {
    return true
  }
  [compat.NEXT_BACK](): compat.IteratorResult<A> {
    return this.nextBack()
  }

  static unsafeFrom<A>(it: compat.BackIterator<A>): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: compat.BackIterator<A>

      constructor(src: compat.BackIterator<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      nextBack(): compat.IteratorResult<A> {
        return this.#src[compat.NEXT_BACK]()
      }

      sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })(it)
  }

  map<B>(f: (a: A) => B): BackIter<B> {
    return new (class extends BackIter<B> {
      readonly #src: BackIter<A>

      constructor(src: BackIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      nextBack(): compat.IteratorResult<B> {
        const { done, value } = this.#src.nextBack()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      sizeBounds(): SizeBounds {
        return this.#src.sizeBounds()
      }
    })(this)
  }

  flatMap<B, IterB extends compat.BackIterator<B> | compat.BackIterable<B>>(
    f: (a: A) => IterB,
  ): BackIter<B>
  flatMap<B, IterB extends IterableOrIterator<B>>(f: (a: A) => IterB): Iter<B>
  flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    return new (class extends BackIter<B> {
      readonly #aSrc: BackIter<A>
      #bSrc: Iterator<B> | null
      #bSrcBack: compat.BackIterator<B> | null
      #singleEndedIterReceived: boolean
      #nextBackInvoked: boolean

      constructor(src: BackIter<A>) {
        super()
        this.#aSrc = src
        this.#bSrc = null
        this.#bSrcBack = null
        this.#singleEndedIterReceived = false
        this.#nextBackInvoked = false
      }

      private enforceHomogeneityInvariant(): void {
        if (this.#singleEndedIterReceived && this.#nextBackInvoked) {
          throw new TypeError(
            "received a single-ended iterator after nextBack was invoked",
          )
        }
      }

      next(): compat.IteratorResult<B> {
        while (true) {
          if (this.#bSrc === null) {
            const { done, value } = this.#aSrc.next()
            if (done) return { done: true, value: undefined }

            let it = f(value)

            if (!this.#singleEndedIterReceived) {
              if (!compat.isBackIterable(it) && !compat.isBackIterator(it)) {
                this.#singleEndedIterReceived = true
              }
            }

            this.enforceHomogeneityInvariant()

            this.#bSrc = asIterator(it)
          }

          const { done, value } = this.#bSrc.next()
          if (done) continue

          return { done: false, value }
        }
      }

      nextBack(): compat.IteratorResult<B> {
        this.#nextBackInvoked = true
        this.enforceHomogeneityInvariant()

        while (true) {
          if (this.#bSrcBack === null) {
            const { done, value } = this.#aSrc.nextBack()
            if (done) return { done: true, value: undefined }

            let it = f(value)

            if (compat.isBackIterator(it)) {
              this.#bSrcBack = it as compat.BackIterator<B>
            } else if (compat.isBackIterable(it)) {
              this.#bSrcBack = it[compat.ITERATOR]() as compat.BackIterator<B>
            } else {
              this.#singleEndedIterReceived = true
              this.enforceHomogeneityInvariant()
              throw "unreachable"
            }
          }

          const { done, value } = this.#bSrcBack[compat.NEXT_BACK]()
          if (done) continue

          return { done: false, value }
        }
      }

      sizeBounds(): SizeBounds {
        let { min } = this.#aSrc.sizeBounds()
        return { min }
      }
    })(this)
  }

  filter(f: (a: A) => boolean): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: BackIter<A>

      constructor(src: BackIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.next()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value: value }
        }
      }

      nextBack(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.nextBack()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value: value }
        }
      }

      sizeBounds(): SizeBounds {
        let { max } = this.#src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  chain<B, IterB extends compat.BackIterator<B> | compat.BackIterable<B>>(
    f: IterB,
  ): BackIter<A | B>
  chain<B, IterB extends IterableOrIterator<B>>(f: IterB): Iter<A | B>
  chain<B>(bs_: IterableOrIterator<B>): Iter<A | B> {
    let bs: compat.BackIterator<B>

    if (compat.isBackIterable(bs_)) {
      bs = bs_[compat.ITERATOR]() as compat.BackIterator<B>
    } else if (compat.isBackIterator(bs_)) {
      bs = bs_ as compat.BackIterator<B>
    } else {
      return super.chain(bs_)
    }

    return new (class extends BackIter<A | B> {
      #srcs: Record<"a" | "b", BackIter<A> | BackIter<B> | null>

      constructor(a: BackIter<A>, b: BackIter<B>) {
        super()
        this.#srcs = { a, b }
      }

      next(): compat.IteratorResult<A | B> {
        let srcName: "a" | "b" = this.#srcs.a !== null ? "a" : "b"
        if (this.#srcs[srcName] === null)
          return { done: true, value: undefined }

        let { done, value } = this.#srcs[srcName].next()
        if (!done) {
          this.#srcs[srcName] = null
          return this.next()
        }

        return { done: false, value: value as A | B }
      }

      nextBack(): compat.IteratorResult<A | B> {
        let srcName: "a" | "b" = this.#srcs.b === null ? "a" : "b"
        if (this.#srcs[srcName] === null)
          return { done: true, value: undefined }

        let { done, value } = this.#srcs[srcName].nextBack()
        if (!done) {
          this.#srcs[srcName] = null
          return this.next()
        }

        return { done: false, value: value as A | B }
      }

      sizeBounds(): SizeBounds {
        if (this.#srcs.a === null && this.#srcs.b === null) {
          return { min: 0, max: 0 }
        } else if (this.#srcs.a !== null && this.#srcs.b === null) {
          return this.#srcs.a.sizeBounds()
        } else if (this.#srcs.a === null && this.#srcs.b !== null) {
          return this.#srcs.b.sizeBounds()
        } else if (this.#srcs.a !== null && this.#srcs.b !== null) {
          let { min: aMin, max: aMax } = this.#srcs.a.sizeBounds()
          let { min: bMin, max: bMax } = this.#srcs.b.sizeBounds()
          return {
            min: aMin + bMin,
            max:
              aMax === undefined || bMax === undefined
                ? undefined
                : aMax + bMax,
          }
        } else {
          throw "unreachable"
        }
      }
    })(this, Iter.from(bs))
  }

  abstract nextBack(): compat.IteratorResult<A>

  reversed(): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: BackIter<A>

      constructor(src: BackIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.nextBack()
      }

      nextBack(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      sizeBounds(): SizeBounds {
        return this.#src.sizeBounds()
      }
    })(this)
  }
}

export abstract class SizeIter<A>
  extends Iter<A>
  implements compat.SizeIterable<A>, compat.SizeIterator<A>
{
  [Symbol.iterator](): SizeIter<A> {
    return this
  }

  [compat.ITERATOR](): SizeIter<A> {
    return this
  }
  get [compat.IS_SIZE_ITERABLE](): true {
    return true
  }
  [compat.SIZE](): number {
    return this.size()
  }

  static unsafeFrom<A>(it: compat.SizeIterator<A>): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: compat.SizeIterator<A>

      constructor(src: compat.SizeIterator<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      size(): number {
        return this.#src[compat.SIZE]()
      }
    })(it)
  }

  map<B>(f: (a: A) => B): SizeIter<B> {
    return new (class extends SizeIter<B> {
      readonly #src: SizeIter<A>

      constructor(src: SizeIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      size(): number {
        return this.#src.size()
      }
    })(this)
  }

  take(n: number): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: SizeIter<A>
      #remaining: number

      constructor(src: SizeIter<A>) {
        super()
        this.#src = src
        this.#remaining = n
      }

      next(): compat.IteratorResult<A> {
        if (this.#remaining <= 0) return { done: true, value: undefined }
        this.#remaining -= 1

        const { done, value } = this.#src.next()
        if (done) {
          this.#remaining = 0
          return { done: true, value: undefined }
        }

        return { done, value }
      }

      size(): number {
        return Math.min(this.#src.size(), this.#remaining)
      }
    })(this)
  }

  drop(n: number): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: SizeIter<A>
      #hasDropped: boolean

      constructor(src: SizeIter<A>) {
        super()
        this.#src = src
        this.#hasDropped = false
      }

      next(): compat.IteratorResult<A> {
        if (!this.#hasDropped) {
          for (let i = 0; i < n; i++) {
            const { done } = this.#src.next()
            if (done) {
              this.#hasDropped = true
              return { done: true, value: undefined }
            }
          }

          this.#hasDropped = true
        }

        return this.#src.next()
      }

      size(): number {
        if (this.#hasDropped) return this.#src.size()
        return Math.max(this.#src.size() - n, 0)
      }
    })(this)
  }

  chain<B, IterB extends compat.SizeIterator<B> | compat.SizeIterable<B>>(
    f: IterB,
  ): SizeIter<A | B>
  chain<B, IterB extends IterableOrIterator<B>>(f: IterB): Iter<A | B>
  chain<B>(bs: IterableOrIterator<B>): Iter<A | B> {
    if (!compat.isSizeIterable(bs) && !compat.isSizeIterator(bs)) {
      return super.chain(bs)
    }
    return new (class extends SizeIter<A | B> {
      #src: SizeIter<A> | SizeIter<B>
      #nextSrc: SizeIter<B> | null

      constructor(aSrc: SizeIter<A>, bSrc: SizeIter<B>) {
        super()
        this.#src = aSrc
        this.#nextSrc = bSrc
      }

      next(): compat.IteratorResult<A | B> {
        const { done, value } = this.#src.next()
        if (done) {
          if (this.#nextSrc) {
            this.#src = this.#nextSrc
            this.#nextSrc = null
            return this.next()
          }

          return { done: true, value: undefined }
        }

        return { done: false, value: value }
      }

      size(): number {
        if (!this.#nextSrc) return this.#src.size()
        return this.#src.size() + this.#nextSrc.size()
      }
    })(this, Iter.from(bs as compat.SizeIterable<B> | compat.SizeIterator<B>))
  }

  sizeBounds(): SizeBounds {
    let size = this.size()
    return { min: size, max: size }
  }

  abstract size(): number
}

export abstract class BackSizeIter<A>
  extends Iter<A>
  implements BackIter<A>, SizeIter<A>
{
  [Symbol.iterator](): BackSizeIter<A> {
    return this
  }

  [compat.ITERATOR](): BackSizeIter<A> {
    return this
  }
  get [compat.IS_BACK_ITERABLE](): true {
    return true
  }
  get [compat.IS_SIZE_ITERABLE](): true {
    return true
  }
  [compat.NEXT_BACK](): compat.IteratorResult<A> {
    return this.nextBack()
  }
  [compat.SIZE](): number {
    return this.size()
  }

  static unsafeFrom<A>(it: compat.BackSizeIterator<A>): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      readonly #src: compat.BackSizeIterator<A>

      constructor(src: compat.BackSizeIterator<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      nextBack(): compat.IteratorResult<A> {
        return this.#src[compat.NEXT_BACK]()
      }

      size(): number {
        return this.#src[compat.SIZE]()
      }
    })(it)
  }

  map<B>(f: (a: A) => B): BackSizeIter<B> {
    return new (class extends BackSizeIter<B> {
      readonly #src: BackSizeIter<A>

      constructor(src: BackSizeIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      nextBack(): compat.IteratorResult<B> {
        const { done, value } = this.#src.nextBack()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      size(): number {
        return this.#src.size()
      }
    })(this)
  }

  flatMap<B, IterB extends compat.BackIterator<B> | compat.BackIterable<B>>(
    f: (a: A) => IterB,
  ): BackIter<B>
  flatMap<B, IterB extends IterableOrIterator<B>>(
    f: (a: A) => IterB,
  ): BackIter<B>
  flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    return BackIter.prototype.flatMap.call(this, f) as Iter<B>
  }

  filter(f: (a: A) => boolean): BackIter<A> {
    return BackIter.prototype.filter.call(this, f) as BackIter<A>
  }

  take(n: number): SizeIter<A> {
    return SizeIter.prototype.take.call(this, n) as SizeIter<A>
  }

  drop(n: number): SizeIter<A> {
    return SizeIter.prototype.drop.call(this, n) as SizeIter<A>
  }

  chain<
    B,
    IterB extends compat.BackSizeIterator<B> | compat.BackSizeIterable<B>,
  >(f: IterB): BackSizeIter<A | B>
  chain<B, IterB extends compat.BackIterator<B> | compat.BackIterable<B>>(
    f: IterB,
  ): BackIter<A | B>
  chain<B, IterB extends compat.SizeIterator<B> | compat.SizeIterable<B>>(
    f: IterB,
  ): SizeIter<A | B>
  chain<B, IterB extends IterableOrIterator<B>>(f: IterB): Iter<A | B>
  chain<B>(bs_: IterableOrIterator<B>): Iter<A | B> {
    let bs: compat.BackSizeIterator<B>

    if (compat.isBackSizeIterable(bs_)) {
      bs = bs_[compat.ITERATOR]() as compat.BackSizeIterator<B>
    } else if (compat.isBackSizeIterator(bs_)) {
      bs = bs_ as compat.BackSizeIterator<B>
    } else if (compat.isSizeIterator(bs_) || compat.isSizeIterator(bs_)) {
      return SizeIter.prototype.chain.call(this, bs_)
    } else {
      return BackIter.prototype.chain.call(this, bs_)
    }

    return new (class extends BackSizeIter<A | B> {
      #srcs: Record<"a" | "b", BackSizeIter<A> | BackSizeIter<B> | null>

      constructor(a: BackSizeIter<A>, b: BackSizeIter<B>) {
        super()
        this.#srcs = { a, b }
      }

      next(): compat.IteratorResult<A | B> {
        let srcName: "a" | "b" = this.#srcs.a !== null ? "a" : "b"
        if (this.#srcs[srcName] === null)
          return { done: true, value: undefined }

        let { done, value } = this.#srcs[srcName].next()
        if (!done) {
          this.#srcs[srcName] = null
          return this.next()
        }

        return { done: false, value: value as A | B }
      }

      nextBack(): compat.IteratorResult<A | B> {
        let srcName: "a" | "b" = this.#srcs.b === null ? "a" : "b"
        if (this.#srcs[srcName] === null)
          return { done: true, value: undefined }

        let { done, value } = this.#srcs[srcName].nextBack()
        if (!done) {
          this.#srcs[srcName] = null
          return this.next()
        }

        return { done: false, value: value as A | B }
      }

      size(): number {
        if (this.#srcs.a === null && this.#srcs.b === null) {
          return 0
        } else if (this.#srcs.a !== null && this.#srcs.b === null) {
          return this.#srcs.a.size()
        } else if (this.#srcs.a === null && this.#srcs.b !== null) {
          return this.#srcs.b.size()
        } else if (this.#srcs.a !== null && this.#srcs.b !== null) {
          return this.#srcs.a.size() + this.#srcs.b.size()
        } else {
          throw "unreachable"
        }
      }
    })(this, Iter.from(bs))
  }

  sizeBounds(): SizeBounds {
    let size = this.size()
    return { min: size, max: size }
  }

  abstract nextBack(): compat.IteratorResult<A>

  reversed(): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      readonly #src: BackSizeIter<A>

      constructor(src: BackSizeIter<A>) {
        super()
        this.#src = src
      }

      next(): compat.IteratorResult<A> {
        return this.#src.nextBack()
      }

      nextBack(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      size(): number {
        return this.#src.size()
      }
    })(this)
  }

  abstract size(): number
}
