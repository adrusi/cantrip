import * as compat from "@cantrip/compat/iter/async"

type SizeBounds = {
  readonly min: number
  readonly max?: number
}

export type IterableOrIterator<A> =
  | compat.Iterable<A>
  | compat.Iterator<A>
  | AsyncIterable<A>
  | AsyncIterator<A>

export type IterFromReturn<A, I> =
  I extends compat.BackSizeIterable<A>
    ? BackSizeAsyncIter<A>
    : I extends compat.SizeIterable<A>
      ? SizeAsyncIter<A>
      : I extends compat.BackIterable<A>
        ? BackAsyncIter<A>
        : AsyncIter<A>

function asAsyncIterator<A>(
  it: IterableOrIterator<A>,
): AsyncIterator<A, unknown> {
  if (compat.isStdIterable(it)) return it[Symbol.asyncIterator]()
  if (compat.isIterable(it)) return it[compat.ASYNC_ITERATOR]()
  return it as AsyncIterator<A, unknown>
}

export abstract class AsyncIter<A> implements compat.Iterator<A> {
  public abstract next(): Promise<IteratorResult<A, unknown>>

  public [Symbol.asyncIterator](): compat.Iterator<A> {
    return this
  }

  public async return(value?: unknown): Promise<IteratorResult<A, unknown>> {
    return await Promise.resolve({ done: true, value })
  }

  public async throw(e?: unknown): Promise<IteratorResult<A, unknown>> {
    return await Promise.reject(
      new Error(typeof e === "string" ? e : "Iterator error"),
    )
  }

  public [compat.ASYNC_ITERATOR](): compat.Iterator<A> {
    return this
  }

  public readonly [compat.IS_ASYNC_ITERATOR] = true as const

  public static from<A, I extends IterableOrIterator<A>>(
    it: I,
  ): IterFromReturn<A, I> {
    if (compat.isBackSizeIterable(it)) {
      return BackSizeAsyncIter.unsafeFrom(it) as IterFromReturn<A, I>
    }
    if (compat.isSizeIterable(it)) {
      return SizeAsyncIter.unsafeFrom(it) as IterFromReturn<A, I>
    }
    if (compat.isBackIterable(it)) {
      return BackAsyncIter.unsafeFrom(it) as IterFromReturn<A, I>
    }
    if (compat.isIterable(it)) {
      return AsyncIter.unsafeFrom(it) as IterFromReturn<A, I>
    }
    if (compat.isStdIterable(it)) {
      return AsyncIter.wrap(it[Symbol.asyncIterator]()) as IterFromReturn<A, I>
    }
    if (compat.isIterator(it)) {
      return AsyncIter.unsafeFrom(it) as IterFromReturn<A, I>
    }
    return AsyncIter.wrap(it as AsyncIterator<A, unknown>) as IterFromReturn<
      A,
      I
    >
  }

  public static unsafeFrom<A>(it: IterableOrIterator<A>): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      private readonly it = compat.isIterable(it)
        ? it[compat.ASYNC_ITERATOR]()
        : asAsyncIterator(it)

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.it.next()
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })()
  }

  public static wrap<A>(it: AsyncIterator<A, unknown>): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      private readonly it = it

      public async next(): Promise<IteratorResult<A, unknown>> {
        const result = await this.it.next()
        if (result.done) {
          return { done: true, value: undefined }
        }
        return { done: false, value: result.value }
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })()
  }

  public static of<A>(...items: A[]): AsyncIter<A> {
    return AsyncIter.wrap(
      (function () {
        let index = 0
        return {
          async next(): Promise<IteratorResult<A, unknown>> {
            if (index >= items.length) {
              return await Promise.resolve({ done: true, value: undefined })
            }
            return await Promise.resolve({ done: false, value: items[index++] })
          },
        }
      })(),
    )
  }

  public static empty<A>(): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      public async next(): Promise<IteratorResult<A, unknown>> {
        return await Promise.resolve({ done: true, value: undefined })
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        return await Promise.resolve({ done: true, value: undefined })
      }

      public size(): number {
        return 0
      }

      public sizeBounds(): SizeBounds {
        return { min: 0, max: 0 }
      }
    })()
  }

  public map<B>(f: (a: A) => B): AsyncIter<B> {
    return new (class extends AsyncIter<B> {
      private readonly src: AsyncIter<A>

      public constructor(src: AsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<B, unknown>> {
        return mapNext(await this.src.next(), f)
      }

      public sizeBounds(): SizeBounds {
        return this.src.sizeBounds()
      }
    })(this)
  }

  public flatMap<B>(f: (a: A) => IterableOrIterator<B>): AsyncIter<B> {
    return new (class extends AsyncIter<B> {
      private readonly aSrc: AsyncIter<A>
      private bSrc: AsyncIter<B> | undefined

      public constructor(src: AsyncIter<A>) {
        super()
        this.aSrc = src
        this.bSrc = undefined
      }

      public async next(): Promise<IteratorResult<B, unknown>> {
        return await flatMapNext(
          { aSrc: this.aSrc, bSrc: this.bSrc },
          f,
          (newBSrc) => {
            this.bSrc = newBSrc
          },
        )
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })(this)
  }

  public filter(predicate: (a: A) => boolean | Promise<boolean>): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      private readonly src: AsyncIter<A>

      public constructor(src: AsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        while (true) {
          const result = await this.src.next()
          if (result.done) return result
          if (await predicate(result.value)) return result
        }
      }

      public sizeBounds(): SizeBounds {
        const { max } = this.src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  public take(n: number): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      private readonly src: AsyncIter<A>
      private remaining: number

      public constructor(src: AsyncIter<A>) {
        super()
        this.src = src
        this.remaining = n
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        if (this.remaining <= 0) {
          return { done: true, value: undefined }
        }
        this.remaining--
        const result = await this.src.next()
        if (result.done) {
          return result
        }
        return result
      }

      public sizeBounds(): SizeBounds {
        const { min, max } = this.src.sizeBounds()
        return {
          min: Math.min(min, n),
          max: max == null ? n : Math.min(max, n),
        }
      }
    })(this)
  }

  public drop(n: number): AsyncIter<A> {
    return new (class extends AsyncIter<A> {
      private readonly src: AsyncIter<A>
      private hasDropped: boolean

      public constructor(src: AsyncIter<A>) {
        super()
        this.src = src
        this.hasDropped = false
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        if (!this.hasDropped) {
          this.hasDropped = true
          for (let i = 0; i < n; i++) {
            const result = await this.src.next()
            if (result.done) return result
          }
        }
        return await this.src.next()
      }

      public sizeBounds(): SizeBounds {
        const { min, max } = this.src.sizeBounds()
        return {
          min: Math.max(0, min - n),
          max: max === undefined ? undefined : Math.max(0, max - n),
        }
      }
    })(this)
  }

  public chain<B>(other: IterableOrIterator<B>): AsyncIter<A | B> {
    return new (class extends AsyncIter<A | B> {
      private src: AsyncIter<A | B>
      private nextSrc: AsyncIter<A | B> | undefined

      public constructor(firstSrc: AsyncIter<A>) {
        super()
        this.src = firstSrc
        this.nextSrc = AsyncIter.from(other)
      }

      public async next(): Promise<IteratorResult<A | B, unknown>> {
        while (true) {
          const result = await this.src.next()
          if (!result.done) return result

          if (this.nextSrc === undefined) {
            return { done: true, value: undefined }
          }

          this.src = this.nextSrc
          this.nextSrc = undefined
        }
      }

      public sizeBounds(): SizeBounds {
        const { min: amin, max: amax } = this.src.sizeBounds()
        const otherIter = AsyncIter.from(other)
        const { min: bmin, max: bmax } = otherIter.sizeBounds()
        return {
          min: amin + bmin,
          max: amax == null || bmax == null ? undefined : amax + bmax,
        }
      }
    })(this)
  }

  public abstract sizeBounds(): SizeBounds
}

export abstract class BackAsyncIter<A>
  extends AsyncIter<A>
  implements compat.BackIterator<A>
{
  public abstract nextBack(): Promise<IteratorResult<A, unknown>>

  public override [Symbol.asyncIterator](): compat.BackIterator<A> {
    return this
  }

  public override [compat.ASYNC_ITERATOR](): compat.BackIterator<A> {
    return this
  }

  public readonly [compat.IS_BACK_ITERABLE] = true as const

  public async [compat.NEXT_BACK](): Promise<IteratorResult<A, unknown>> {
    return await this.nextBack()
  }

  public static override unsafeFrom<A>(
    it: IterableOrIterator<A>,
  ): BackAsyncIter<A> {
    return new (class extends BackAsyncIter<A> {
      private readonly src = compat.isIterable(it)
        ? it[compat.ASYNC_ITERATOR]()
        : asAsyncIterator(it)

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.src.next()
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        return await (compat.isBackIterator(this.src)
          ? (this.src[compat.NEXT_BACK]() as Promise<
              IteratorResult<A, unknown>
            >)
          : this.src.next())
      }

      public sizeBounds(): SizeBounds {
        return { min: 0 }
      }
    })()
  }

  public override map<B>(f: (a: A) => B): BackAsyncIter<B> {
    return new (class extends BackAsyncIter<B> {
      private readonly src: BackAsyncIter<A>

      public constructor(src: BackAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<B, unknown>> {
        return mapNext(await this.src.next(), f)
      }

      public async nextBack(): Promise<IteratorResult<B, unknown>> {
        return mapNextBack(await this.src.nextBack(), f)
      }

      public sizeBounds(): SizeBounds {
        return this.src.sizeBounds()
      }
    })(this)
  }

  public override flatMap<B>(
    f: (a: A) => IterableOrIterator<B>,
  ): BackAsyncIter<B> {
    // For simplicity, fall back to base implementation for now
    // Full double-ended flatMap is complex and would need state management
    return super.flatMap(f) as BackAsyncIter<B>
  }

  public override filter(
    predicate: (a: A) => boolean | Promise<boolean>,
  ): BackAsyncIter<A> {
    return new (class extends BackAsyncIter<A> {
      private readonly src: BackAsyncIter<A>

      public constructor(src: BackAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        while (true) {
          const result = await this.src.next()
          if (result.done) return result
          if (await predicate(result.value)) return result
        }
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        while (true) {
          const result = await this.src.nextBack()
          if (result.done) return result
          if (await predicate(result.value)) return result
        }
      }

      public sizeBounds(): SizeBounds {
        const { max } = this.src.sizeBounds()
        return { min: 0, max }
      }
    })(this)
  }

  public override chain<B>(other: IterableOrIterator<B>): BackAsyncIter<A | B> {
    return new (class extends BackAsyncIter<A | B> {
      private readonly srcs: [AsyncIter<A | B>, AsyncIter<A | B>]

      public constructor(firstSrc: BackAsyncIter<A>) {
        super()
        this.srcs = [firstSrc, AsyncIter.from(other)]
      }

      public async next(): Promise<IteratorResult<A | B, unknown>> {
        for (const src of this.srcs) {
          const result = await src.next()
          if (!result.done) return result
        }
        return { done: true, value: undefined }
      }

      public async nextBack(): Promise<IteratorResult<A | B, unknown>> {
        for (let i = this.srcs.length - 1; i >= 0; i--) {
          const src = this.srcs[i]
          const result =
            src instanceof BackAsyncIter
              ? await src.nextBack()
              : await src.next()
          if (!result.done) return result
        }
        return { done: true, value: undefined }
      }

      public sizeBounds(): SizeBounds {
        const { min: amin, max: amax } = this.srcs[0].sizeBounds()
        const { min: bmin, max: bmax } = this.srcs[1].sizeBounds()
        return {
          min: amin + bmin,
          max: amax == null || bmax == null ? undefined : amax + bmax,
        }
      }
    })(this)
  }

  public reversed(): BackAsyncIter<A> {
    return new (class extends BackAsyncIter<A> {
      private readonly src: BackAsyncIter<A>

      public constructor(src: BackAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.src.nextBack()
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        return await this.src.next()
      }

      public sizeBounds(): SizeBounds {
        return this.src.sizeBounds()
      }
    })(this)
  }
}

export abstract class SizeAsyncIter<A>
  extends AsyncIter<A>
  implements compat.SizeIterator<A>
{
  public abstract size(): number

  public override [Symbol.asyncIterator](): compat.SizeIterator<A> {
    return this
  }

  public override [compat.ASYNC_ITERATOR](): compat.SizeIterator<A> {
    return this
  }

  public readonly [compat.IS_SIZE_ITERABLE] = true as const

  public [compat.SIZE](): number {
    return this.size()
  }

  public static override unsafeFrom<A>(
    it: IterableOrIterator<A>,
  ): SizeAsyncIter<A> {
    return new (class extends SizeAsyncIter<A> {
      private readonly src = compat.isIterable(it)
        ? it[compat.ASYNC_ITERATOR]()
        : asAsyncIterator(it)

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.src.next()
      }

      public size(): number {
        return compat.isSizeIterator(this.src) ? this.src[compat.SIZE]() : 0
      }
    })()
  }

  public override map<B>(f: (a: A) => B): SizeAsyncIter<B> {
    return new (class extends SizeAsyncIter<B> {
      private readonly src: SizeAsyncIter<A>

      public constructor(src: SizeAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<B, unknown>> {
        return mapNext(await this.src.next(), f)
      }

      public size(): number {
        return this.src.size()
      }
    })(this)
  }

  public override take(n: number): SizeAsyncIter<A> {
    return new (class extends SizeAsyncIter<A> {
      private readonly src: SizeAsyncIter<A>
      private remaining: number

      public constructor(src: SizeAsyncIter<A>) {
        super()
        this.src = src
        this.remaining = n
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        if (this.remaining <= 0) {
          return { done: true, value: undefined }
        }
        this.remaining--
        return await this.src.next()
      }

      public size(): number {
        return Math.min(this.src.size(), n)
      }
    })(this)
  }

  public override drop(n: number): SizeAsyncIter<A> {
    return new (class extends SizeAsyncIter<A> {
      private readonly src: SizeAsyncIter<A>
      private hasDropped: boolean

      public constructor(src: SizeAsyncIter<A>) {
        super()
        this.src = src
        this.hasDropped = false
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        if (!this.hasDropped) {
          this.hasDropped = true
          for (let i = 0; i < n; i++) {
            const result = await this.src.next()
            if (result.done) return result
          }
        }
        return await this.src.next()
      }

      public size(): number {
        return Math.max(0, this.src.size() - n)
      }
    })(this)
  }

  public override chain<B>(other: IterableOrIterator<B>): SizeAsyncIter<A | B> {
    return new (class extends SizeAsyncIter<A | B> {
      private src: AsyncIter<A | B>
      private nextSrc: AsyncIter<A | B> | undefined
      private readonly originalSrc: SizeAsyncIter<A>

      public constructor(firstSrc: SizeAsyncIter<A>) {
        super()
        this.originalSrc = firstSrc
        this.src = firstSrc
        this.nextSrc = AsyncIter.from(other)
      }

      public async next(): Promise<IteratorResult<A | B, unknown>> {
        while (true) {
          const result = await this.src.next()
          if (!result.done) return result

          if (this.nextSrc === undefined) {
            return { done: true, value: undefined }
          }

          this.src = this.nextSrc
          this.nextSrc = undefined
        }
      }

      public size(): number {
        const otherIter = AsyncIter.from(other)
        const otherSize =
          otherIter instanceof SizeAsyncIter ? otherIter.size() : 0
        return this.originalSrc.size() + otherSize
      }
    })(this)
  }

  public override sizeBounds(): SizeBounds {
    const size = this.size()
    return { min: size, max: size }
  }
}

export abstract class BackSizeAsyncIter<A>
  extends BackAsyncIter<A>
  implements compat.BackSizeIterator<A>
{
  public abstract size(): number

  public override [Symbol.asyncIterator](): compat.BackSizeIterator<A> {
    return this
  }

  public override [compat.ASYNC_ITERATOR](): compat.BackSizeIterator<A> {
    return this
  }

  public override readonly [compat.IS_BACK_ITERABLE] = true as const
  public readonly [compat.IS_SIZE_ITERABLE] = true as const

  public override async [compat.NEXT_BACK](): Promise<
    IteratorResult<A, unknown>
  > {
    return await this.nextBack()
  }

  public [compat.SIZE](): number {
    return this.size()
  }

  public static override unsafeFrom<A>(
    it: IterableOrIterator<A>,
  ): BackSizeAsyncIter<A> {
    return new (class extends BackSizeAsyncIter<A> {
      private readonly src = compat.isIterable(it)
        ? it[compat.ASYNC_ITERATOR]()
        : asAsyncIterator(it)

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.src.next()
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        return await (compat.isBackIterator(this.src)
          ? (this.src[compat.NEXT_BACK]() as Promise<
              IteratorResult<A, unknown>
            >)
          : this.src.next())
      }

      public size(): number {
        return compat.isSizeIterator(this.src) ? this.src[compat.SIZE]() : 0
      }
    })()
  }

  public override map<B>(f: (a: A) => B): BackSizeAsyncIter<B> {
    return new (class extends BackSizeAsyncIter<B> {
      private readonly src: BackSizeAsyncIter<A>

      public constructor(src: BackSizeAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<B, unknown>> {
        return mapNext(await this.src.next(), f)
      }

      public async nextBack(): Promise<IteratorResult<B, unknown>> {
        return mapNextBack(await this.src.nextBack(), f)
      }

      public size(): number {
        return this.src.size()
      }
    })(this)
  }

  // These operations don't preserve exact size, so they fall back to BackAsyncIter
  public override flatMap<B>(
    f: (a: A) => IterableOrIterator<B>,
  ): BackAsyncIter<B> {
    return super.flatMap(f) as BackAsyncIter<B>
  }

  public override filter(
    predicate: (a: A) => boolean | Promise<boolean>,
  ): BackAsyncIter<A> {
    return super.filter(predicate) as BackAsyncIter<A>
  }

  public override take(n: number): BackAsyncIter<A> {
    return super.take(n) as BackAsyncIter<A>
  }

  public override drop(n: number): BackAsyncIter<A> {
    return super.drop(n) as BackAsyncIter<A>
  }

  public override chain<B>(
    other: IterableOrIterator<B>,
  ): BackSizeAsyncIter<A | B> {
    return new (class extends BackSizeAsyncIter<A | B> {
      private readonly srcs: [AsyncIter<A | B>, AsyncIter<A | B>]

      public constructor(firstSrc: BackSizeAsyncIter<A>) {
        super()
        this.srcs = [firstSrc, AsyncIter.from(other)]
      }

      public async next(): Promise<IteratorResult<A | B, unknown>> {
        for (const src of this.srcs) {
          const result = await src.next()
          if (!result.done) return result
        }
        return { done: true, value: undefined }
      }

      public async nextBack(): Promise<IteratorResult<A | B, unknown>> {
        for (let i = this.srcs.length - 1; i >= 0; i--) {
          const src = this.srcs[i]
          const result =
            src instanceof BackAsyncIter
              ? await src.nextBack()
              : await src.next()
          if (!result.done) return result
        }
        return { done: true, value: undefined }
      }

      public size(): number {
        const aSize =
          this.srcs[0] instanceof SizeAsyncIter ? this.srcs[0].size() : 0
        const bSize =
          this.srcs[1] instanceof SizeAsyncIter ? this.srcs[1].size() : 0
        return aSize + bSize
      }
    })(this)
  }

  public override sizeBounds(): SizeBounds {
    const size = this.size()
    return { min: size, max: size }
  }

  public override reversed(): BackSizeAsyncIter<A> {
    return new (class extends BackSizeAsyncIter<A> {
      private readonly src: BackSizeAsyncIter<A>

      public constructor(src: BackSizeAsyncIter<A>) {
        super()
        this.src = src
      }

      public async next(): Promise<IteratorResult<A, unknown>> {
        return await this.src.nextBack()
      }

      public async nextBack(): Promise<IteratorResult<A, unknown>> {
        return await this.src.next()
      }

      public size(): number {
        return this.src.size()
      }
    })(this)
  }
}

// Helper functions for map operations
function mapNext<A, B>(
  result: IteratorResult<A, unknown>,
  f: (a: A) => B,
): IteratorResult<B, unknown> {
  if (result.done) {
    return { done: true, value: undefined }
  }
  return { done: false, value: f(result.value) }
}

function mapNextBack<A, B>(
  result: IteratorResult<A, unknown>,
  f: (a: A) => B,
): IteratorResult<B, unknown> {
  if (result.done) {
    return { done: true, value: undefined }
  }
  return { done: false, value: f(result.value) }
}

// Helper functions for flatMap operations
interface FlatMapState<A, B> {
  aSrc: AsyncIter<A>
  bSrc: AsyncIter<B> | undefined
}

function enforceFlatMapHomogeneityInvariant<A, B>(
  f: (a: A) => IterableOrIterator<B>,
  a: A,
): AsyncIter<B> {
  return AsyncIter.from(f(a))
}

async function flatMapNext<A, B>(
  state: FlatMapState<A, B>,
  f: (a: A) => IterableOrIterator<B>,
  updateBSrc: (newBSrc: AsyncIter<B> | undefined) => void,
): Promise<IteratorResult<B, unknown>> {
  while (true) {
    if (state.bSrc !== undefined) {
      const bResult = await state.bSrc.next()
      if (!bResult.done) {
        return bResult
      }
      updateBSrc(undefined)
    }

    const aResult = await state.aSrc.next()
    if (aResult.done) {
      return { done: true, value: undefined }
    }

    const newBSrc = enforceFlatMapHomogeneityInvariant(f, aResult.value)
    updateBSrc(newBSrc)
    state.bSrc = newBSrc
  }
}
