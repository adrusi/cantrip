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

// export type IterFrom

function asIterator<A>(src: IterableOrIterator<A>): Iterator<A> {
  if (compat.isIterable(src)) return src[compat.ITERATOR]()
  if (compat.isStdIterable(src)) return src[Symbol.iterator]()
  return src
}

export abstract class Iter<A>
  implements compat.Iterable<A>, compat.Iterator<A>
{
  public [Symbol.iterator](): this {
    return this
  }

  public abstract next(): compat.IteratorResult<A>

  public return(_value?: unknown): { done: true; value: undefined } {
    return { done: true, value: undefined }
  }

  public throw(_e?: unknown): { done: true; value: undefined } {
    return { done: true, value: undefined }
  }

  public [compat.ITERATOR](): this {
    return this
  }

  public readonly [compat.IS_ITERATOR] = true as const

  public static from<const It extends IterableOrIterator<unknown>>(
    it: It,
  ): IterFromReturn<It>

  public static from(it: IterableOrIterator<unknown>): Iter<unknown> {
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

  public static unsafeFrom<A>(it: compat.Iterator<A>): Iter<A> {
    let state = {
      src: it,
    }

    return new (class extends Iter<A> {
      public next(): compat.IteratorResult<A> {
        return state.src.next()
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })()
  }

  public static wrap<A>(it: Iterator<A>): Iter<A> {
    let state = {
      src: it,
      done: false,
    }

    return new (class extends Iter<A> {
      public next(): compat.IteratorResult<A> {
        if (state.done) return { done: true, value: undefined }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let { done, value } = state.src.next()
        if (done) {
          state.done = true
          return { done: true, value: undefined }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { done: false, value }
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })()
  }

  public static of<A>(...values: A[]): BackSizeIter<A> {
    return Iter.from(values)
  }

  public static empty<A>(): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      public next(): compat.IteratorResult<A> {
        return { done: true, value: undefined }
      }

      public nextBack(): compat.IteratorResult<A> {
        return { done: true, value: undefined }
      }

      public size(): number {
        return 0
      }
    })()
  }

  public map<B>(f: (a: A) => B): Iter<B> {
    let state: MapState<A> = {
      src: this,
    }

    return new (class extends Iter<B> {
      public next(): compat.IteratorResult<B> {
        return mapNext(state, f)
      }

      public sizeBounds(): SizeBounds {
        return state.src.sizeBounds()
      }
    })()
  }

  public flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    return new (class extends Iter<B> {
      readonly #aSrc: Iter<A>
      #bSrc: Iterator<B> | null

      public constructor(src: Iter<A>) {
        super()
        this.#aSrc = src
        this.#bSrc = null
      }

      public next(): compat.IteratorResult<B> {
        while (true) {
          if (this.#bSrc === null) {
            const { done, value } = this.#aSrc.next()
            if (done) return { done: true, value: undefined }

            this.#bSrc = asIterator(f(value))
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { done, value } = this.#bSrc.next()
          if (done) continue

          return { done: false, value }
        }
      }

      public sizeBounds(): SizeBounds {
        let { min } = this.#aSrc.sizeBounds()
        return { min }
      }
    })(this)
  }

  public filter(f: (a: A) => boolean): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>

      public constructor(src: Iter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.next()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value }
        }
      }

      public sizeBounds(): SizeBounds {
        let { max } = this.#src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  public take(n: number): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>
      #remaining: number

      public constructor(src: Iter<A>) {
        super()
        this.#src = src
        this.#remaining = n
      }

      public next(): compat.IteratorResult<A> {
        if (this.#remaining <= 0) return { done: true, value: undefined }
        this.#remaining -= 1

        const { done, value } = this.#src.next()
        if (done) {
          this.#remaining = 0
          return { done: true, value: undefined }
        }

        return { done, value }
      }

      public sizeBounds(): SizeBounds {
        let { min, max } = this.#src.sizeBounds()
        return {
          min: Math.min(min, this.#remaining),
          max:
            max === undefined ? undefined : Math.max(max ?? 0, this.#remaining),
        }
      }
    })(this)
  }

  public drop(n: number): Iter<A> {
    return new (class extends Iter<A> {
      readonly #src: Iter<A>
      #hasDropped: boolean

      public constructor(src: Iter<A>) {
        super()
        this.#src = src
        this.#hasDropped = false
      }

      public next(): compat.IteratorResult<A> {
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

      public sizeBounds(): SizeBounds {
        if (this.#hasDropped) return this.#src.sizeBounds()
        let { min, max } = this.#src.sizeBounds()
        return {
          min: Math.max(min - n, 0),
          max: max === undefined ? undefined : Math.max(max - n, 0),
        }
      }
    })(this)
  }

  public chain<B>(bs: IterableOrIterator<B>): Iter<A | B> {
    return new (class extends Iter<A | B> {
      #src: Iter<A> | Iter<B>
      #nextSrc: Iter<B> | null

      public constructor(aSrc: Iter<A>, bSrc: Iter<B>) {
        super()
        this.#src = aSrc
        this.#nextSrc = bSrc
      }

      public next(): compat.IteratorResult<A | B> {
        const { done, value } = this.#src.next()
        if (done) {
          if (this.#nextSrc) {
            this.#src = this.#nextSrc
            this.#nextSrc = null
            return this.next()
          }

          return { done: true, value: undefined }
        }

        return { done: false, value }
      }

      public sizeBounds(): SizeBounds {
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

  public abstract sizeBounds(): SizeBounds
}

export abstract class BackIter<A>
  extends Iter<A>
  implements compat.BackIterable<A>, compat.BackIterator<A>
{
  public override [Symbol.iterator](): this {
    return this
  }

  public override [compat.ITERATOR](): this {
    return this
  }

  public readonly [compat.IS_BACK_ITERABLE] = true as const

  public [compat.NEXT_BACK](): compat.IteratorResult<A> {
    return this.nextBack()
  }

  public static override unsafeFrom<A>(
    it: compat.BackIterator<A>,
  ): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: compat.BackIterator<A>

      public constructor(src: compat.BackIterator<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      public nextBack(): compat.IteratorResult<A> {
        return this.#src[compat.NEXT_BACK]()
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })(it)
  }

  public override map<B>(f: (a: A) => B): BackIter<B> {
    let state: MapStateBack<A> = {
      src: this,
    }

    return new (class extends BackIter<B> {
      public next(): compat.IteratorResult<B> {
        return mapNext(state, f)
      }

      public nextBack(): compat.IteratorResult<B> {
        return mapNextBack(state, f)
      }

      public sizeBounds(): SizeBounds {
        return state.src.sizeBounds()
      }
    })()
  }

  public override flatMap<
    B,
    IterB extends compat.BackIterator<B> | compat.BackIterable<B>,
  >(f: (a: A) => IterB): BackIter<B>

  public override flatMap<B, IterB extends IterableOrIterator<B>>(
    f: (a: A) => IterB,
  ): Iter<B>

  public override flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    let state: FlatMapStateBack<A, B> = {
      aSrc: this,
      bSrc: null,
      bSrcBack: null,
      singleEndedIterReceived: false,
      nextBackInvoked: false,
    }

    return new (class extends BackIter<B> {
      public next(): compat.IteratorResult<B> {
        return flatMapNext(state, f)
      }

      public nextBack(): compat.IteratorResult<B> {
        return flatMapNextBack(state, f)
      }

      public sizeBounds(): SizeBounds {
        let { min } = state.aSrc.sizeBounds()
        return { min }
      }
    })()
  }

  public override filter(f: (a: A) => boolean): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: BackIter<A>

      public constructor(src: BackIter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.next()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value }
        }
      }

      public nextBack(): compat.IteratorResult<A> {
        while (true) {
          const { done, value } = this.#src.nextBack()
          if (done) return { done: true, value: undefined }
          if (f(value)) return { done: false, value }
        }
      }

      public sizeBounds(): SizeBounds {
        let { max } = this.#src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  public override chain<
    B,
    IterB extends compat.BackIterator<B> | compat.BackIterable<B>,
  >(f: IterB): BackIter<A | B>

  public override chain<B, IterB extends IterableOrIterator<B>>(
    f: IterB,
  ): Iter<A | B>

  public override chain<B>(bs_: IterableOrIterator<B>): Iter<A | B> {
    let bs: compat.BackIterator<B>

    if (compat.isBackIterable(bs_)) {
      bs = bs_[compat.ITERATOR]() as compat.BackIterator<B>
    } else if (compat.isBackIterator(bs_)) {
      bs = bs_ as compat.BackIterator<B>
    } else {
      return super.chain(bs_)
    }

    return new (class extends BackIter<A | B> {
      #srcs: {
        a: BackIter<A> | BackIter<B> | null
        b: BackIter<A> | BackIter<B> | null
      }

      public constructor(a: BackIter<A>, b: BackIter<B>) {
        super()
        this.#srcs = { a, b }
      }

      public next(): compat.IteratorResult<A | B> {
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

      public nextBack(): compat.IteratorResult<A | B> {
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

      public sizeBounds(): SizeBounds {
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
          throw new Error("unreachable")
        }
      }
    })(this, Iter.from(bs))
  }

  public abstract nextBack(): compat.IteratorResult<A>

  public reversed(): BackIter<A> {
    return new (class extends BackIter<A> {
      readonly #src: BackIter<A>

      public constructor(src: BackIter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        return this.#src.nextBack()
      }

      public nextBack(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      public sizeBounds(): SizeBounds {
        return this.#src.sizeBounds()
      }
    })(this)
  }
}

export abstract class SizeIter<A>
  extends Iter<A>
  implements compat.SizeIterable<A>, compat.SizeIterator<A>
{
  public override [Symbol.iterator](): this {
    return this
  }

  public override [compat.ITERATOR](): this {
    return this
  }

  public readonly [compat.IS_SIZE_ITERABLE] = true as const

  public [compat.SIZE](): number {
    return this.size()
  }

  public static override unsafeFrom<A>(
    it: compat.SizeIterator<A>,
  ): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: compat.SizeIterator<A>

      public constructor(src: compat.SizeIterator<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      public size(): number {
        return this.#src[compat.SIZE]()
      }
    })(it)
  }

  public override map<B>(f: (a: A) => B): SizeIter<B> {
    return new (class extends SizeIter<B> {
      readonly #src: SizeIter<A>

      public constructor(src: SizeIter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      public size(): number {
        return this.#src.size()
      }
    })(this)
  }

  public override take(n: number): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: SizeIter<A>
      #remaining: number

      public constructor(src: SizeIter<A>) {
        super()
        this.#src = src
        this.#remaining = n
      }

      public next(): compat.IteratorResult<A> {
        if (this.#remaining <= 0) return { done: true, value: undefined }
        this.#remaining -= 1

        const { done, value } = this.#src.next()
        if (done) {
          this.#remaining = 0
          return { done: true, value: undefined }
        }

        return { done, value }
      }

      public size(): number {
        return Math.min(this.#src.size(), this.#remaining)
      }
    })(this)
  }

  public override drop(n: number): SizeIter<A> {
    return new (class extends SizeIter<A> {
      readonly #src: SizeIter<A>
      #hasDropped: boolean

      public constructor(src: SizeIter<A>) {
        super()
        this.#src = src
        this.#hasDropped = false
      }

      public next(): compat.IteratorResult<A> {
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

      public size(): number {
        if (this.#hasDropped) return this.#src.size()
        return Math.max(this.#src.size() - n, 0)
      }
    })(this)
  }

  public override chain<
    B,
    IterB extends compat.SizeIterator<B> | compat.SizeIterable<B>,
  >(f: IterB): SizeIter<A | B>

  public override chain<B, IterB extends IterableOrIterator<B>>(
    f: IterB,
  ): Iter<A | B>

  public override chain<B>(bs: IterableOrIterator<B>): Iter<A | B> {
    if (!compat.isSizeIterable(bs) && !compat.isSizeIterator(bs)) {
      return super.chain(bs)
    }
    return new (class extends SizeIter<A | B> {
      #src: SizeIter<A> | SizeIter<B>
      #nextSrc: SizeIter<B> | null

      public constructor(aSrc: SizeIter<A>, bSrc: SizeIter<B>) {
        super()
        this.#src = aSrc
        this.#nextSrc = bSrc
      }

      public next(): compat.IteratorResult<A | B> {
        const { done, value } = this.#src.next()
        if (done) {
          if (this.#nextSrc) {
            this.#src = this.#nextSrc
            this.#nextSrc = null
            return this.next()
          }

          return { done: true, value: undefined }
        }

        return { done: false, value }
      }

      public size(): number {
        if (!this.#nextSrc) return this.#src.size()
        return this.#src.size() + this.#nextSrc.size()
      }
    })(this, Iter.from(bs as compat.SizeIterable<B> | compat.SizeIterator<B>))
  }

  public sizeBounds(): SizeBounds {
    let size = this.size()
    return { min: size, max: size }
  }

  public abstract size(): number
}

export abstract class BackSizeIter<A>
  extends Iter<A>
  implements BackIter<A>, SizeIter<A>
{
  public override [Symbol.iterator](): this {
    return this
  }

  public override [compat.ITERATOR](): this {
    return this
  }

  public readonly [compat.IS_BACK_ITERABLE] = true as const

  public readonly [compat.IS_SIZE_ITERABLE] = true as const

  public [compat.NEXT_BACK](): compat.IteratorResult<A> {
    return this.nextBack()
  }

  public [compat.SIZE](): number {
    return this.size()
  }

  public static override unsafeFrom<A>(
    it: compat.BackSizeIterator<A>,
  ): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      readonly #src: compat.BackSizeIterator<A>

      public constructor(src: compat.BackSizeIterator<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      public nextBack(): compat.IteratorResult<A> {
        return this.#src[compat.NEXT_BACK]()
      }

      public size(): number {
        return this.#src[compat.SIZE]()
      }
    })(it)
  }

  public override map<B>(f: (a: A) => B): BackSizeIter<B> {
    return new (class extends BackSizeIter<B> {
      readonly #src: BackSizeIter<A>

      public constructor(src: BackSizeIter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<B> {
        const { done, value } = this.#src.next()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      public nextBack(): compat.IteratorResult<B> {
        const { done, value } = this.#src.nextBack()
        if (done) return { done: true, value: undefined }
        return { done: false, value: f(value) }
      }

      public size(): number {
        return this.#src.size()
      }
    })(this)
  }

  public override flatMap<
    B,
    IterB extends compat.BackIterator<B> | compat.BackIterable<B>,
  >(f: (a: A) => IterB): BackIter<B>

  public override flatMap<B, IterB extends IterableOrIterator<B>>(
    f: (a: A) => IterB,
  ): BackIter<B>

  public override flatMap<B>(f: (a: A) => IterableOrIterator<B>): Iter<B> {
    return BackIter.prototype.flatMap.call(this, f) as Iter<B>
  }

  public override filter(f: (a: A) => boolean): BackIter<A> {
    return BackIter.prototype.filter.call(this, f) as BackIter<A>
  }

  public override take(n: number): SizeIter<A> {
    return SizeIter.prototype.take.call(this, n) as SizeIter<A>
  }

  public override drop(n: number): SizeIter<A> {
    return SizeIter.prototype.drop.call(this, n) as SizeIter<A>
  }

  public override chain<
    B,
    IterB extends compat.BackSizeIterator<B> | compat.BackSizeIterable<B>,
  >(f: IterB): BackSizeIter<A | B>

  public override chain<
    B,
    IterB extends compat.BackIterator<B> | compat.BackIterable<B>,
  >(f: IterB): BackIter<A | B>

  public override chain<
    B,
    IterB extends compat.SizeIterator<B> | compat.SizeIterable<B>,
  >(f: IterB): SizeIter<A | B>

  public override chain<B, IterB extends IterableOrIterator<B>>(
    f: IterB,
  ): Iter<A | B>

  public override chain<B>(bs_: IterableOrIterator<B>): Iter<A | B> {
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
      #srcs: {
        a: BackSizeIter<A> | BackSizeIter<B> | null
        b: BackSizeIter<A> | BackSizeIter<B> | null
      }

      public constructor(a: BackSizeIter<A>, b: BackSizeIter<B>) {
        super()
        this.#srcs = { a, b }
      }

      public next(): compat.IteratorResult<A | B> {
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

      public nextBack(): compat.IteratorResult<A | B> {
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

      public size(): number {
        if (this.#srcs.a === null && this.#srcs.b === null) {
          return 0
        } else if (this.#srcs.a !== null && this.#srcs.b === null) {
          return this.#srcs.a.size()
        } else if (this.#srcs.a === null && this.#srcs.b !== null) {
          return this.#srcs.b.size()
        } else if (this.#srcs.a !== null && this.#srcs.b !== null) {
          return this.#srcs.a.size() + this.#srcs.b.size()
        } else {
          throw new Error("unreachable")
        }
      }
    })(this, Iter.from(bs))
  }

  public sizeBounds(): SizeBounds {
    let size = this.size()
    return { min: size, max: size }
  }

  public abstract nextBack(): compat.IteratorResult<A>

  public reversed(): BackSizeIter<A> {
    return new (class extends BackSizeIter<A> {
      readonly #src: BackSizeIter<A>

      public constructor(src: BackSizeIter<A>) {
        super()
        this.#src = src
      }

      public next(): compat.IteratorResult<A> {
        return this.#src.nextBack()
      }

      public nextBack(): compat.IteratorResult<A> {
        return this.#src.next()
      }

      public size(): number {
        return this.#src.size()
      }
    })(this)
  }

  public abstract size(): number
}

interface MapState<A> {
  src: Iter<A>
}

interface MapStateBack<A> extends MapState<A> {
  src: BackIter<A>
}

function mapNext<A, B>(
  state: MapState<A>,
  f: (a: A) => B,
): compat.IteratorResult<B> {
  const { done, value } = state.src.next()
  if (done) return { done: true, value: undefined }
  return { done: false, value: f(value) }
}

function mapNextBack<A, B>(
  state: MapStateBack<A>,
  f: (a: A) => B,
): compat.IteratorResult<B> {
  const { done, value } = state.src.nextBack()
  if (done) return { done: true, value: undefined }
  return { done: false, value: f(value) }
}

interface FlatMapState<A, B> {
  aSrc: Iter<A>
  bSrc: Iterator<B> | null
  bSrcBack: compat.BackIterator<B> | null
  singleEndedIterReceived: boolean
  nextBackInvoked: boolean
}

interface FlatMapStateBack<A, B> extends FlatMapState<A, B> {
  aSrc: BackIter<A>
}

function enforceFlatMapHomogeneityInvariant<A, B>(
  state: FlatMapState<A, B>,
): void {
  if (state.singleEndedIterReceived && state.nextBackInvoked) {
    throw new TypeError(
      "received a single-ended iterator during backwards iteration",
    )
  }
}

function flatMapNext<A, B>(
  state: FlatMapState<A, B>,
  f: (a: A) => IterableOrIterator<B>,
): compat.IteratorResult<B> {
  enforceFlatMapHomogeneityInvariant(state)

  while (true) {
    if (state.bSrc === null) {
      const { done, value } = state.aSrc.next()
      if (done) return { done: true, value: undefined }

      let it = f(value)

      if (!state.singleEndedIterReceived) {
        if (!compat.isBackIterable(it) && !compat.isBackIterator(it)) {
          state.singleEndedIterReceived = true
          enforceFlatMapHomogeneityInvariant(state)
        }
      }

      state.bSrc = asIterator(it)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { done, value } = state.bSrc.next()
    if (done) continue

    return { done: false, value }
  }
}

function flatMapNextBack<A, B>(
  state: FlatMapStateBack<A, B>,
  f: (a: A) => IterableOrIterator<B>,
): compat.IteratorResult<B> {
  state.nextBackInvoked = true
  enforceFlatMapHomogeneityInvariant(state)

  while (true) {
    if (state.bSrcBack === null) {
      const { done, value } = state.aSrc.nextBack()
      if (done) return { done: true, value: undefined }

      let it = f(value)

      if (compat.isBackIterator(it)) {
        state.bSrcBack = it as compat.BackIterator<B>
      } else if (compat.isBackIterable(it)) {
        state.bSrcBack = it[compat.ITERATOR]() as compat.BackIterator<B>
      } else {
        state.singleEndedIterReceived = true
        enforceFlatMapHomogeneityInvariant(state)
        throw new Error("unreachable")
      }
    }

    const { done, value } = state.bSrcBack[compat.NEXT_BACK]()
    if (done) continue

    return { done: false, value }
  }
}
