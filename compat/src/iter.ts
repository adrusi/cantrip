export const ITERATOR = Symbol("ITERATOR")
export const IS_ITERATOR = Symbol("IS_ITERATOR")
export const IS_BACK_ITERABLE = Symbol("IS_BACK_ITERABLE")
export const IS_SIZE_ITERABLE = Symbol("IS_SIZE_ITERABLE")
export const NEXT_BACK = Symbol("NEXT_BACK")
export const SIZE = Symbol("SIZE")

export type { CompatIterable as Iterable }
export interface CompatIterable<A> {
  [ITERATOR](): CompatIterator<A>
}

export interface BackIterable<A> {
  [ITERATOR](): BackIterator<A>
  [IS_BACK_ITERABLE]: true
}

export interface SizeIterable<A> {
  [ITERATOR](): SizeIterator<A>
  [IS_SIZE_ITERABLE]: true
}

export interface BackSizeIterable<A> extends BackIterable<A>, SizeIterable<A> {
  [ITERATOR](): BackSizeIterator<A>
}

export type { CompatIteratorResult as IteratorResult }
type CompatIteratorResult<A> =
  | { done: false; value: A }
  | { done: true; value: undefined }

export type { CompatIterator as Iterator }
interface CompatIterator<A> extends Iterator<A> {
  [IS_ITERATOR]: true
  next(): CompatIteratorResult<A>
  return?(value?: unknown): CompatIteratorResult<A>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throw?(e?: any): CompatIteratorResult<A>
}

export interface BackIterator<A> extends CompatIterator<A> {
  [NEXT_BACK](): CompatIteratorResult<A>
}

export interface SizeIterator<A> extends CompatIterator<A> {
  [SIZE](): number
}

export interface BackSizeIterator<A> extends BackIterator<A>, SizeIterator<A> {}

export function isStdIterable(it: unknown): it is Iterable<unknown> {
  if (typeof it === "string") return true
  return (
    typeof it === "object" &&
    it !== null &&
    Symbol.iterator in it &&
    typeof it[Symbol.iterator] === "function"
  )
}

export function isIterable(it: unknown): it is CompatIterable<unknown> {
  if (typeof it === "string") it = new String(it)
  return (
    isStdIterable(it) && ITERATOR in it && typeof it[ITERATOR] === "function"
  )
}

export function isBackIterable(it: unknown): it is BackIterable<unknown> {
  if (typeof it === "string") it = new String(it)
  return (
    isIterable(it) &&
    IS_BACK_ITERABLE in it &&
    typeof it[IS_BACK_ITERABLE] === "boolean" &&
    it[IS_BACK_ITERABLE]
  )
}

export function isSizeIterable(it: unknown): it is SizeIterable<unknown> {
  if (typeof it === "string") it = new String(it)
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

export function isStdIterator(it: unknown): it is Iterator<unknown> {
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
    IS_ITERATOR in it &&
    typeof it[IS_ITERATOR] === "boolean" &&
    it[IS_ITERATOR]
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
