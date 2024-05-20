import { NEXT_BACK, SIZE, IS_BACK_ITERABLE, IS_SIZE_ITERABLE } from "./iter"

export { NEXT_BACK, SIZE, IS_BACK_ITERABLE, IS_SIZE_ITERABLE } from "./iter"

export const ASYNC_ITERATOR = Symbol("ASYNC_ITERATOR")
export const IS_ASYNC_ITERATOR = Symbol("IS_ASYNC_ITERATOR")

export type { CompatIterable as Iterable }
interface CompatIterable<A> {
  [ASYNC_ITERATOR](): CompatIterator<A>
}

export interface BackIterable<A> extends CompatIterable<A> {
  [ASYNC_ITERATOR](): BackIterator<A>
}

export interface SizeIterable<A> extends CompatIterable<A> {
  [ASYNC_ITERATOR](): SizeIterator<A>
}

export interface BackSizeIterable<A> extends BackIterable<A>, SizeIterable<A> {
  [ASYNC_ITERATOR](): BackSizeIterator<A>
}

export type { CompatIterator as Iterator }
interface CompatIterator<A> extends AsyncIterator<A, unknown> {
  [IS_ASYNC_ITERATOR]: true
  next(): Promise<IteratorResult<A, unknown>>
  return?(
    value?: unknown | PromiseLike<unknown>,
  ): Promise<IteratorResult<A, unknown>>
  throw?(e?: any): Promise<IteratorResult<A, unknown>>
}

export interface BackIterator<A> extends CompatIterator<A> {
  [NEXT_BACK](): Promise<IteratorResult<A, unknown>>
}

export interface SizeIterator<A> extends CompatIterator<A> {
  [SIZE](): number
}

export interface BackSizeIterator<A> extends BackIterator<A>, SizeIterator<A> {}

export function isStdIterable(it: unknown): it is AsyncIterable<unknown> {
  return (
    typeof it === "object" &&
    it !== null &&
    Symbol.asyncIterator in it &&
    typeof it[Symbol.asyncIterator] === "function"
  )
}

export function isIterable(it: unknown): it is CompatIterable<unknown> {
  return (
    isStdIterable(it) &&
    ASYNC_ITERATOR in it &&
    typeof it[ASYNC_ITERATOR] === "function"
  )
}

export function isBackIterable(it: unknown): it is BackIterable<unknown> {
  return (
    isIterable(it) &&
    IS_BACK_ITERABLE in it &&
    typeof it[IS_BACK_ITERABLE] === "boolean" &&
    it[IS_BACK_ITERABLE]
  )
}

export function isSizeIterable(it: unknown): it is SizeIterable<unknown> {
  return (
    isIterable(it) &&
    IS_SIZE_ITERABLE in it &&
    typeof it[IS_SIZE_ITERABLE] === "boolean" &&
    it[IS_SIZE_ITERABLE]
  )
}

export function isBackSizeIterable(
  it: unknown,
): it is BackSizeIterable<unknown> {
  return isBackIterable(it) && isSizeIterable(it)
}

export function isStdIterator(it: unknown): it is AsyncIterator<unknown> {
  return (
    typeof it === "object" &&
    it !== null &&
    "next" in it &&
    typeof it.next === "function"
  )
}

export function isIterator(it: unknown): it is CompatIterator<unknown> {
  return (
    isStdIterator(it) &&
    IS_ASYNC_ITERATOR in it &&
    typeof it[IS_ASYNC_ITERATOR] === "boolean" &&
    it[IS_ASYNC_ITERATOR]
  )
}

export function isBackIterator(it: unknown): it is BackIterator<unknown> {
  return (
    isIterator(it) && NEXT_BACK in it && typeof it[NEXT_BACK] === "function"
  )
}

export function isSizeIterator(it: unknown): it is SizeIterator<unknown> {
  return isIterator(it) && SIZE in it && typeof it[SIZE] === "function"
}

export function isBackSizeIterator(
  it: unknown,
): it is BackSizeIterator<unknown> {
  return isBackIterator(it) && isSizeIterator(it)
}
